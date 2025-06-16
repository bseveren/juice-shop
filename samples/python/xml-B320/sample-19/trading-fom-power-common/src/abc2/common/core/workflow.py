import re
import socket
import time
import asyncio
import logging
import aiohttp
import pymongo.errors
import requests
import pandas as pd
from gzip import compress, decompress
from lxml import etree
from pytz import timezone
from io import StringIO, BytesIO
from datetime import datetime
from pymongo.cursor import Cursor
from dataclasses import dataclass, field
from typing import ClassVar, Optional, List, Tuple
from concurrent.futures import ThreadPoolExecutor
from pymongo import IndexModel
from abc import abstractmethod, ABC
from inspect import iscoroutinefunction
from sqlalchemy import create_engine
from abc2.utils.elephant import Elephant
from abc2.utils.toolbox import gather, get_loop

@dataclass
class Upload(ABC, Stack, Elephant):
    limits: Optional[int] = 2
    name: ClassVar[str] = 'stack_model_upload_source'
    pointer: ClassVar[str] = None
    start_date: ClassVar[str] = field(default='2013-11-01', repr=False, init=False)
    fmt: ClassVar[str] = field(default='yyyy-MM-dd HH:mm', repr=False, init=False)
    feedbacks: ClassVar[list] = []

    def __post_init__(self):
        super(Upload, self).__post_init__()
        self.env = 'prod' if 'PR' in socket.gethostname() else 'dev'
        super(Stack, self).__post_init__()
        self.url = f'{self.root}/fta/upload'
        self.empty = []

        try:
            uri = self.engines[self.pointer]
        except KeyError:
            self.engine = None
        else:
            self.engine = create_engine(uri)

    @abstractmethod
    def get_data(self, item: dict, *, loop=None, executor: None) -> pd.DataFrame:
        pass

    @staticmethod
    def create_element(tag: str, text: Optional[str] = '') -> str:
        return f'<{tag}>{text}</{tag}>' if len(text) > 0 else f'<{tag}></{tag}>'

    @staticmethod
    def generate_data_items(df: pd.DataFrame) -> str:
        lst = [f'<Item>%s</Item>' % ''.join([f'<{k}>{v}</{k}>' for k, v in x.items()]) for x in df.to_dict('records')]
        return ''.join(lst)

    def generate_spot_set_xml(self, *, sas_id: str, description: str, timezone: str, data_items: str) -> str:
        meta = (f'{self.credentials}'
                f'<SASID>{sas_id}</SASID>'
                f'{self.create_element(tag="Description", text=description)}'
                f'<Timezone>{timezone}</Timezone>')
        return f'{self.prolog}<SpotDataSet>{meta}<Data>{data_items}</Data></SpotDataSet>'

    def generate_forward_set_xml(self, *, sas_id: str, description: str, timezone: str, tag: str, end_date: str,
                                 data_items: str) -> str:
        meta = (f'{self.credentials}'
                f'<SASID>{sas_id}</SASID>'
                f'{self.create_element(tag="Description", text=description)}'
                f'<Timezone>{timezone}</Timezone>'
                f'{self.create_element(tag="Updated", text=tag)}'
                f'{self.create_element(tag="EndDate", text=end_date)}')
        return f'{self.prolog}<FBMCDataSet>{meta}<Data>{data_items}</Data></FBMCDataSet>'

    def generate_scenario_set_xml(self, *, sas_id: str, description: str, timezone: str, tag: str, end_date: str,
                                  data_items: str) -> str:
        meta = (f'{self.credentials}'
                f'<SASID>{sas_id}</SASID>'
                f'{self.create_element(tag="Description", text=description)}'
                f'<Timezone>{timezone}</Timezone>'
                f'{self.create_element(tag="Name", text=tag)}'
                f'{self.create_element(tag="EndDate", text=end_date)}')
        return f'{self.prolog}<ScenarioDataSet>{meta}<Data>{data_items}</Data></ScenarioDataSet>'

    def generate_xml(self, item: dict, data_items: str, end_date: Optional[str] = '') -> str:
        tag = item['tag']

        funcs = {
            'spot': lambda: self.generate_spot_set_xml(sas_id=item['sas_id'], description=item['description'],
                                                       timezone=item['timezone'], data_items=data_items),
            'forward': lambda: self.generate_forward_set_xml(sas_id=item['sas_id'], description=item['description'],
                                                             timezone=item['timezone'], tag=tag,
                                                             end_date=end_date, data_items=data_items),
            'scenario': lambda: self.generate_scenario_set_xml(sas_id=item['sas_id'], description=item['description'],
                                                               timezone=item['timezone'], tag=tag,
                                                               end_date=end_date, data_items=data_items)
        }
        return funcs[item['curve_type']]()

    def get_cursor(self, source: List[str], *, curve_type: Optional[List[str]] = None,
                   sas_ids: Optional[List[str]] = None, curve_ids: Optional[List[str]] = None,
                   tags: Optional[List[str]] = None) -> Cursor:
        collection = self.database[self.name]
        feedback = self.database['stack_model_upload_feedback']
        query = {'source': {'$in': source}}
        if curve_type: query['curve_type'] = {'$in': curve_type}
        if sas_ids: query['sas_id'] = {'$in': sas_ids}
        if curve_ids: query['curve_id'] = {'$in': curve_ids}
        if tags: query['tag'] = {'$in': tags}
        projection = {'_id': 0}

        logger.info(f'Deleting previous feedbacks: {query}')
        feedback.delete_many(query)

        logger.info(f'Querying upload set: {query}')
        return collection.find(query, projection)

    @staticmethod
    def get_error(content: bytes) -> str:
        try:
            tree = etree.parse(BytesIO(content))
        except etree.XMLSyntaxError as e:
            logger.error(f"Unparsable error response: {content}", e)

    def run(self, source: List[str], *, curve_type: Optional[List[str]] = None, sas_ids: Optional[List[str]] = None,
            curve_ids: Optional[List[str]] = None, tags: Optional[List[str]] = None,
            check_data_availability: Optional[bool] = False) -> None:
        start = time.time()
        loop = get_loop()
        executor = ThreadPoolExecutor(max_workers=self.limits)
        cursor = self.get_cursor(source, curve_type=curve_type, sas_ids=sas_ids, curve_ids=curve_ids, tags=tags)
        tasks = [self.workflow(loop, executor, item, check_data_availability=check_data_availability) for item in cursor]
        loop.run_until_complete(gather(self.limits, tasks))

        if check_data_availability is False and self.feedbacks:
            logger.info(f'Updating feedbacks')
            for doc in self.feedbacks:
                try:
                    self.database['stack_model_upload_feedback'].insert_one(doc)
                except pymongo.errors.DuplicateKeyError:
                    logger.warning(f'Duplicated document: {doc}')

        logger.info(f'Total elapsed: {time.time() - start} seconds')

@dataclass
class Download(Stack, Elephant):
    limits: Optional[int] = 10
    fmt: ClassVar[str] = field(default='%Y-%m-%d', repr=False, init=False)

    def __post_init__(self):
        super(Download, self).__post_init__()
        self.env = 'prod' if 'PR' in socket.gethostname() else 'dev'
        super(Stack, self).__post_init__()
        self.today = datetime.today().replace(hour=0, minute=0, second=0, microsecond=0)
        self.max_bus_end = pd.Timestamp.max.replace(hour=0, minute=0, second=0, microsecond=0)
        source = 'stack_model_download_source'
        dinput = 'stack_model_input'
        output = 'stack_model_output'
        archive = 'stack_model_archive'
        self.async_input = self.async_database[dinput]
        self.async_output = self.async_database[output]
        self.async_archive = self.async_database[archive]
        self.output = self.database[output]
        self.input = self.database[dinput]
        self.archive = self.database[archive]
        self.source = self.database[source]

    def get_url(self, *, scenario_id: str, key: str, output_type: str, tag: Optional[str] = None) -> str:
        suffix = f'account={self.account}&password={self.password}'
        base = lambda: f'{self.root}/export/results_xml?scenario_id={scenario_id}&key={key}'
        opt = {
            'base_case': base,
            'weather_sensitivity': lambda: f'{self.root}/abc1/sensitivity/{scenario_id}/results/{key}/xml?resolution=hourly',
            'backrun': lambda: f'{self.root}/abc1/sensitivity/{scenario_id}/results/{key}/variant/{tag}/xml?filter_id=&resolution=monthly',
            'adhoc': base,
            'curve': base
        }
        return f'{opt[output_type]()}&{suffix}'

    def _parse_base_case(self, *, key: str, content: bytes) -> List[dict]:
        tree = etree.parse(BytesIO(content))

        try:
            meta = {
                'id': tree.findall('./header/property/id')[0].text,
                'name': tree.findall('./header/property/name')[0].text,
            }
        except IndexError:
            logger.info(f'Parsing is completed with empty dataset: {key}')
            return [{}]

        for item in tree.findall('./header/property/object'):
            meta.update({item.attrib['type']: item.text})

        scenario = {e.tag: pd.to_datetime(e.text, errors='ignore').strftime(self.fmt)
        if not isinstance(pd.to_datetime(e.text, errors='ignore'), str) else e.text
                    for e in tree.findall('./header/scenario/')}
        units = tree.findall('./series/units')[0].text

        # https://pymongo.readthedocs.io/en/stable/examples/datetimes.html
        # When storing datetime.datetime objects that specify a timezone
        # (i.e. they have a tzinfo property that isn’t None),
        # PyMongo will convert those datetimes to UTC automatically
        # In addition to the floating point issue, it is better to store the series.data as text
        data = [{e.tag: e.text, 'date': e.attrib['date']} for e in tree.findall('./series/value')]
        logger.info(f'Parsing is completed: {key}')
        return [{'property': meta, 'scenario': scenario, 'series': {'units': units, 'data': data}}]

    def _parse_weather_sensitivity(self, *, key: str, content: bytes) -> List[dict]:
        tree = etree.parse(BytesIO(content))
        l_timezone = tree.findall('./timezone')[0].text
        results = []

        for x in tree.findall('./results'):
            try:
                meta = {
                    'id': x.findall('./header/property/id')[0].text,
                    'name': x.findall('./header/property/name')[0].text
                }
            except IndexError:
                logger.info(f'Parsing is completed with empty dataset: {key}')
                return [{}]

            for item in x.findall('./header/property/object'):
                meta.update({item.attrib['type']: item.text})

            results.append(
                {
                    'property': meta,
                    'timezone': l_timezone,
                    'scenario': {
                        'id': x.findall('./header/scenario/id')[0].text,
                        'name': x.findall('./header/scenario/name')[0].text,
                    },
                    'assumptions': [y.text for y in x.findall('./header/assumptions/assumption')],
                    'series': {
                        'units': x.findall('./series/units')[0].text,
                        'data': [{e.tag: e.text, 'date': e.attrib['date']} for e in x.findall('./series/value')]
                    }
                }
            )
        logger.info(f'Parsing is completed: {key}')
        return results

    def parse(self, key: str, output_type: str, content: bytes) -> List[dict]:
        return {

            'weather_sensitivity': lambda: self._parse_weather_sensitivity(key=key, content=content),
            'adhoc': lambda: self._parse_base_case(key=key, content=content),
            'backrun': lambda: self._parse_weather_sensitivity(key=key, content=content),
            'curve': lambda: self._parse_base_case(key=key, content=content)
        }[output_type]()

    async def update_output(self, loop, executor, key: str, output_type: str, today: datetime, content: bytes) -> None:
        items = await loop.run_in_executor(executor, self.parse, key, output_type, content)
        message = "Items are empty"
        for item in items:
            assumptions = item.get('assumptions', [])
            tmp = set(re.findall(r'\d+', ''.join(assumptions)))
            message = f'{output_type} - {key}'
            if tmp: message = f'{message} - {",".join(tmp)}'
            logger.info(f'Calculating delta: {message}')
            inserted, expired = await loop.run_in_executor(executor, self.differ, key, output_type, today, item)
            async_collection = self.async_input if output_type == 'curve' else self.async_output

            if expired:
                logger.info(f'Updating {len(expired)} expired records: {message}')
                for x in expired:
                    await async_collection.update_many(
                        x['filter'],
                        x['update'],
                        array_filters=x['array_filters']
                    )
            else:
                logger.info(f'No expired records were found: {message}')

            if inserted:
                logger.info(f'Inserting {len(inserted)} new records: {message}')
                await async_collection.insert_many(inserted)
            else:
                logger.info(f'No new records were found: {message}')

        logger.info(f'Completed progressing: {message}')

    async def workflow(self, loop, executor, scenario_id: str, key: str, tag: str, output_type: str,
                       raise_for_status: Optional[bool] = False) -> None:
        self.async_client._io_loop = loop
        url = self.get_url(scenario_id=scenario_id, key=key, output_type=output_type, tag=tag)
        logger.info(f'Processing: {url}')

        async with aiohttp.ClientSession() as session:
            response = await session.get(url, headers=self.stack_headers)

            if response.status == 200:
                content = await response.content.read()
                if output_type in ['base_case', 'weather_sensitivity']:
                    logger.info(f'Archiving: {key}')
                    compressed = await loop.run_in_executor(executor, compress, content)
                    await self.async_archive.update_one(
                        {'key': key, 'inserted': self.today, 'type': output_type},
                        {'$set': {'data': compressed}},
                        upsert=True
                    )
                    logger.info(f'Done archiving: {key}')
                await self.update_output(loop, executor, key, output_type, self.today, content)
            else:
                if raise_for_status:
                    response.raise_for_status()
                else:
                    logger.error(f'Failed to retrieve, {await response.text()}: {url}')
