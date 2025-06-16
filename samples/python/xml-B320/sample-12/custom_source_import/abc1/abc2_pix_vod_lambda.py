import time
import datetime
from datetime import timezone
import json
import logging
import os
from functools import wraps

from urllib.parse import urljoin
import boto3
import requests
from lxml import etree
from requests.adapters import HTTPAdapter
from urllib3 import Retry

from botocore.exceptions import ClientError

    import jwt

@safe_call
def extract_season_content(abc2_metadata):
    season_content_xml_str = abc2_metadata.get("season", {}).get("content", "")
    if season_content_xml_str:
        season_content = etree.fromstring(season_content_xml_str.encode("utf-8"))
        return season_content
    else:
        return None

def abc2_meta_to_zype_meta(
    bucket,
    object_key,
    json_object,
    is_direct=False,
    region=None,
):
    extracted_meta = {}
    base_path = os.path.dirname(object_key)
    base_file, extension = os.path.splitext(object_key)
    if is_direct:
        abc2_metadata = json_object
    else:
        abc2_metadata = s3_object_metadata(json_object)
    extracted_meta["episode_content"] = extract_episode_content(abc2_metadata)
    extracted_meta["episode_tags"] = extract_episode_tags(
        extracted_meta["episode_content"]
    )
    extracted_meta["season_content"] = extract_season_content(abc2_metadata)
    extracted_meta["episode_file_list"] = abc2_metadata.get("episode", {}).get(
        "files", []
    )
    extracted_meta["csi_uri"] = (
        f"csi://{WM_CSI_ID}:{bucket}:{object_key}" if WM_CSI_ID else ""
    )
    extracted_meta["video_title"], extracted_meta["season_title"] = (
        extract_video_and_season_title(extracted_meta)
    )
    extracted_meta["source_id"] = (
        extracted_meta["episode_content"].xpath("//productIdPartner")[0].text
    )
    extracted_meta["categories_attributes"] = extract_categories_attributes(
        extracted_meta
    )
    extracted_meta["video_short_description"] = (
        extracted_meta["episode_content"].xpath("//shortSynopsis")[0].text
    )
    extracted_meta["video_description"] = (
        extracted_meta["episode_content"].xpath("//longSynopsis")[0].text
    )
    extracted_meta["custom_thumbnail"], extracted_meta["jpg_list"] = extract_thumbnails(
        extracted_meta["episode_file_list"], base_path
    )
    extracted_meta["image_attributes"] = extract_image_attributes(
        extracted_meta["jpg_list"], bucket
    )
    extracted_meta["s3_last_modified"] = build_s3_last_modified(
        bucket, f"{base_file}{extension}"
    )
    extracted_meta["episode"] = extract_episode_number(extracted_meta)
    extracted_meta["season"] = extract_season_number(extracted_meta)
    extracted_meta["enable_at"], extracted_meta["disable_at"] = extract_publish_dates(
        extracted_meta["episode_content"]
    )
    if extracted_meta["enable_at"]:
        extracted_meta["published_at"] = extracted_meta["enable_at"]
    extracted_meta["genre"] = extracted_genre(extracted_meta["episode_content"])
    extracted_meta["ad_timings_attributes"] = extract_ad_timings(
        abc2_metadata.get("episode", {}).get("adbreaks", [])
    )
    extracted_meta["parental_guidelines_rating"] = extract_parental_guidance_rating(
        extracted_meta
    )
    extracted_meta["gfx_date_text"] = extract_gfx_date_text(
        extracted_meta["episode_content"]
    )

    # Extract duration -- not supposed to be accurate but might be a good approx
    extracted_meta["duration"] = extract_duration(extracted_meta["episode_content"])

    extracted_meta["storage_region"] = region or DEFAULT_REGION
    extracted_meta["storage_provider"] = "s3"
    extracted_meta["storage_bucket"] = bucket
    extracted_meta["object_key"] = object_key

    return extracted_meta

@safe_call(default_return=False, log_message="Failed to process record")
def process_record(record):
    record_params = extract_record_params(record)
    force_video_update = record_params.get(PARAM_FORCE_VIDEO_UPDATE)
    bucket, object_key = (
        record_params["bucket"],
        record_params["object_key"],
    )

    logger.info(
        "Did trigger %s/%s with extracted params %s",
        bucket,
        object_key,
        record_params,
    )

    base_file, extension = base_name_and_extension(object_key)
    # transform object_key to have a canonical value from here
    object_key = f"{base_file}.ts"
    ts_object_metadata = perform_s3_action("head_object", bucket, f"{base_file}.ts")
    is_direct = False
    if base_file.startswith("broadcast/"):
        additional_tags = get_additionnal_tags(bucket, base_file)
        if not additional_tags:
            logger.info("Skipping %s - missing tags", object_key)
            return False

        tags = ["FAST"] + additional_tags
        tags_str = "".join(f"<tags>{tag}</tags>" for tag in tags)
        file_identifier = os.path.basename(base_file)
        json_object = {
            "season": {"identifier": "", "content": "", "files": []},
            "serie": {"identifier": "", "content": "", "files": []},
            "episode": {
                "identifier": file_identifier,
                "content": f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                            <ns2:products xmlns:ns2=\"http://inter.ws.medusa.sfr.com/\">"
                               <productIdPartner>{file_identifier}</productIdPartner>
                               <title>{file_identifier}</title>
                               <originalTitle>{file_identifier}</originalTitle>
                               <shortSynopsis></shortSynopsis>
                               <longSynopsis></longSynopsis>
                               {tags_str}
                               <countries>France</countries>
                           </ns2:products>""",
                "files": [f"{file_identifier}.ts"],
                # "duration": 1273.68,
                "adbreaks": [],
            },
        }
        is_direct = True
    else:
        json_object = perform_s3_action("get_object", bucket, f"{base_file}.json")

    if not ts_object_metadata or not json_object:
        logger.info("Skipping %s - missing ts or json", object_key)
        return False

    if DO_PROCESS:
        with ZypeSession(
            api_key=ZYPE_API_KEY, base_url=ZYPE_API_BASE_ENDPOINT
        ) as zype_session:
            zype_meta = abc2_meta_to_zype_meta(
                bucket,
                object_key,
                json_object,
                is_direct=is_direct,
                region=record_params.get("region"),
            )

            if not is_fast_episode(zype_meta["episode_tags"]):
                logger.info("Skipping %s - not a FAST episode", object_key)
                return False

            # Delay processing according to file type to prevent race conditions during concurrent handling of multiple files.

            try:
                if extension.lower() == ".ts" and VIDEO_PROCESSING_DELAY:
                    time.sleep(int(VIDEO_PROCESSING_DELAY))
                elif extension.lower() == ".jpg" and THUMBNAIL_PROCESSING_DELAY:
                    time.sleep(int(THUMBNAIL_PROCESSING_DELAY))
            except:
                logger.warning("Failed to use wait config", exc_info=True)

            source_id = zype_meta["source_id"]
            if force_video_update:
                video = find_zype_video_by_source_id(zype_session, source_id)
            else:
                video = find_or_create_zype_video(
                    source_id, zype_session, zype_meta, bucket
                )

            if not video:
                logger.warning("Failed to find or create video for %s", object_key)
                return False

            if video.get("new_video"):
                create_import_and_data_source_with_ad_timings(
                    zype_session, zype_meta, object_key, bucket, video
                )
            else:
                new_asset, s3_last_modified = is_new_asset(
                    video, ts_object_metadata, object_key, bucket
                )
                if force_video_update or new_asset:
                    if handle_metadata_update(
                        force_video_update,
                        extension,
                        zype_meta,
                        video,
                        bucket,
                        zype_session,
                        object_key,
                    ):
                        return True

                    if handle_video_update(
                        force_video_update,
                        extension,
                        zype_session,
                        zype_meta,
                        object_key,
                        bucket,
                        video,
                    ):
                        (
                            update_video_custom_attributes(
                                new_asset,
                                zype_meta,
                                video,
                                zype_session,
                                object_key,
                                s3_last_modified,
                            )
                            if not force_video_update
                            else True
                        )
                        return True

                    if handle_images_update(
                        force_video_update,
                        extension,
                        zype_meta,
                        video,
                        bucket,
                        zype_session,
                        object_key,
                    ):
                        (
                            update_video_custom_attributes(
                                new_asset,
                                zype_meta,
                                video,
                                zype_session,
                                object_key,
                                s3_last_modified,
                            )
                            if not force_video_update
                            else True
                        )
                        return True
                else:

def lambda_handler(event, *_, **__):

    records = event.get("Records", [])

    if not records:
        logger.info("No records found")
        return {"statusCode": 200, "body": "No records found"}

    records_to_process = [
            record
            for record in records
            if record.get("eventSource") in ["aws:sqs", "aws:s3"]
        ]
    
    processes_result = [process_record(record) for record in records_to_process]
    # Using python shortcut to count true elements
    processed_count = sum(processes_result)

    return {"statusCode": 200, "body": f"Done. Processed {processed_count} records."}
