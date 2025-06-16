import base64
import io
import logging
import re
import tempfile
import zipfile
from pathlib import Path

from html_to_markdown import convert_to_markdown
from lxml import etree
from PIL import Image as PILImage

from .completion_types import DocumentType
from .types import Image, MarkdownDocument, Page

def _parse_manifest(manifest_content: str) -> dict[str, list[str]]:
    parser = etree.XMLParser(resolve_entities=False, no_network=True, recover=True)
    try:
        root = etree.fromstring(manifest_content.encode("utf-8"), parser=parser)
    except Exception as e:
        raise ValueError("SCORM: failed to parse manifest") from e
    if root is None:
        raise ValueError("SCORM: failed to parse manifest")

    resources: dict[str, list[str]] = {}
    try:
        # Find all <resources> elements under <manifest>
        for resources_elem in root.xpath("./*[local-name()='resources']"):  # type: ignore
            # For each <resource> with type='webcontent'
            resource_elems = resources_elem.xpath(
                "./*[local-name()='resource' and @type='webcontent']"
            )
            if not isinstance(resource_elems, list):
                raise ValueError("SCORM: failed to parse manifest")
            for resource in resource_elems:
                resource_id = resource.get("identifier")
                if resource_id is None:
                    continue
                files = []
                for file_elem in resource.xpath("./*[local-name()='file']"):
                    href = file_elem.get("href")
                    if href is not None:
                        files.append(href)
                resources[resource_id] = files
    except TypeError:
        raise ValueError("SCORM: failed to parse manifest")
    return resources

def scorm_parse(
    doc_name: str,
    hash: str,
    blob: bytes,
) -> MarkdownDocument:
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        temp_file.write(blob)
        temp_file.seek(0)
        return scorm_to_markdown_document(Path(temp_file.name), hash)

def scorm_to_markdown_document(scorm_file: Path, hash: str) -> MarkdownDocument:
    image_data_map = {}
    with zipfile.ZipFile(scorm_file, "r") as zf:
        if "imsmanifest.xml" not in zf.namelist():
            raise ValueError("SCORM file does not contain imsmanifest.xml")
        with zf.open("imsmanifest.xml") as f:
            manifest_content = f.read().decode("utf-8")
        resources = _parse_manifest(manifest_content)
        html_files = []
        image_files = []
        logger.debug(f"SCORM: file {hash} contains {len(resources)} resources")
        for files in resources.values():
            for file in files:
                if file.lower().endswith((".html", ".htm")):
                    html_files.append(file)
                elif re.match(r".*\.(jpg|jpeg|png)$", file.lower()):
                    image_files.append(file)

        for img_path in image_files:
            with zf.open(img_path) as f:
                data = f.read()
                ext = img_path.lower().split(".")[-1]
                try:
                    pil_img = PILImage.open(io.BytesIO(data))
                    width, height = pil_img.size
                    if ext == "png":
                        # Convert PNG to JPEG in memory
                        with io.BytesIO() as output:
                            pil_img = pil_img.convert("RGB")
                            pil_img.save(output, format="JPEG")
                            data = output.getvalue()
                        mime = "jpeg"
                    else:
                        mime = "jpeg" if ext in ("jpg", "jpeg") else ext
                except Exception:
                    width, height = 0, 0
                    mime = "jpeg"
                b64_data = base64.b64encode(data).decode("utf-8", errors="ignore")
                image_data_map[img_path] = {
                    "base64": f"data:image/{mime};base64," + b64_data,
                    "width": width,
                    "height": height,
                }

        logger.info(
            f"SCORM: file {hash} processing {len(html_files)} html files and {len(image_files)} images"
        )
        pages = []
        for html_path in html_files:
            try:
                with zf.open(html_path) as f:
                    html_content = f.read().decode("utf-8", errors="ignore")
            except Exception as e:
                logger.warning(f"SCORM: failed to read {html_path}: {e}")
                continue
            markdown = convert_to_markdown(html_content)
            # Find images referenced in this HTML
            images_for_page = []
            for img_path in image_files:
                img_name = img_path.split("/")[-1]
                if img_name in html_content:
                    img_info = image_data_map[img_path]
                    images_for_page.append(
                        Image(
                            id=img_name,
                            width=img_info["width"],
                            height=img_info["height"],
                            image_base64=img_info["base64"],
                        )
                    )

            page_index = str(
                Path(html_path).with_suffix("")
            )  # Strip .html or .htm from the page index
            page = Page(index=page_index, markdown=markdown, images=images_for_page)
            pages.append(page)
    logger.info(f"SCORM: file {hash} finished processing {len(pages)} pages")
    return MarkdownDocument(pages=pages, doc_type=DocumentType.COURSE_MATERIAL)
