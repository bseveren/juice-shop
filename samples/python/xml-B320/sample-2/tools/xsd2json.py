import argparse
import json
from collections import OrderedDict

from lxml import etree

class JSONSchema:
    def __init__(self, xsd_src):
        try:
            # Try and read src as XML (will work for requests.content (string)
            self.root = etree.XML(xsd_src, parser=self._create_parser())
        except etree.XMLSyntaxError:
            # Or parse the object (will work for files)
            doc = etree.parse(xsd_src, parser=self._create_parser())
            self.root = doc.getroot()

        self.namespaces = self.root.nsmap
        self.data_type = dict()

        self.id = xsd_src.split("_")[-1].split(".")[0]

        self._include_files()

        self.schema = self._generate_schema()

    def _create_parser(self):
        return etree.XMLParser(load_dtd=True, resolve_entities=True)

    def _include_files(self):
        # Resolve xs:include elements
        for include in self.root.findall(".//xs:include", namespaces=self.namespaces):
            schema_location = include.get("schemaLocation")
            if schema_location:
                # Parse the included schema
                included_doc = etree.parse(
                    schema_location, parser=self._create_parser()
                )
                included_root = included_doc.getroot()
                # Replace the xs:include element with the content of the included schema
                include.getparent().replace(include, included_root)

    def _generate_schema(self):
        schema = OrderedDict()
        schema["$schema"] = "http://json-schema.org/draft-07/schema#"
        schema["$defs"] = OrderedDict()
        schema["$id"] = self.id
        schema["type"] = "object"
        schema["properties"] = OrderedDict()
        schema["required"] = list()

        self._build_types(schema)
        self._build_data(schema)

        return schema

    def _build_data(self, schema):
        xpath_expr = "xs:group/xs:choice/xs:group"
        group_elements = self.root.xpath(xpath_expr, namespaces=self.namespaces)
        content = OrderedDict()

        schema["additionalProperties"] = False

        if group_elements:
            for group in group_elements:
                ref = postfix_from_qname(group.get("ref"))
                xpath_expr = f"xs:group[@name='{ref}']/xs:choice/xs:element | xs:group[@name='{ref}']/xs:sequence/xs:element"
                elements = self.root.xpath(xpath_expr, namespaces=self.namespaces)

                for elem in elements:
                    if elem.get("ref", None):
                        name = postfix_from_qname(elem.get("ref"))
                        content[name] = self._dispatch(elem)
                    elif elem.get("name", None):
                        name = postfix_from_qname(elem.get("name"))
                        content[name] = self._dispatch(elem)
                    else:
                        raise Exception(f"Unknown group element type: {elem}")

            schema["properties"] = content
        else:
            xpath_expr = "xs:element"
            for elem in self.root.xpath(xpath_expr, namespaces=self.namespaces):
                member_name = elem.attrib.get("name")
                member_type = elem.attrib.get("type")
                member_ref = elem.attrib.get("ref")
                member_min_occurs = elem.attrib.get("minOccurs")

                if member_name:
                    if member_type:
                        if is_xsd_data_type(member_type):
                            schema["properties"][member_name] = xsd_data_type(
                                member_type
                            )
                        else:
                            ref = postfix_from_qname(member_type)
                            schema["properties"][member_name] = {
                                "$ref": f"#/$defs/{ref}"
                            }

                    elif member_ref:
                        ref = postfix_from_qname(member_ref)
                        schema["properties"][member_name] = {"$ref": f"#/$defs/{ref}"}
                    else:
                        raise Exception(f"Unknown element type: {elem}")

                    if member_min_occurs == "0":
                        schema["properties"][member_name]["nullable"] = True
