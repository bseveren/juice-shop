import json
from collections import namedtuple
from collections.abc import Mapping
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Callable, Generator, Union, Any
from lxml import etree
import enum

import attr
from pywo.time import utcnow_tzaware

from abc2 import git
from abc2.git import clone_locally
from abc2.helpers import AttribAndPropertiesMixIn

@attr.s(auto_attribs=True, frozen=True)
class FactSpecification(AttribAndPropertiesMixIn):
    """
    Meta-data details of a fact specification. It holds everything apart of the code
    """
    name: str
    id: str
    updated_at: datetime
    file_name: str
    relative_path: str
    owners: List[git.GitAuthor]

    description: str
    enrichments: Dict[str, FactEnrichment]
    products_type: Dict[Product, str]
    outputs: Dict[str, FactOutput]
    decisions: Dict[str, FactDecision]
    signals: Dict[str, FactSignal]
    references: List[str]
    precondition: str
    definition: str

    @classmethod
    def create_from_file(cls, xml_fname: Path, facts_root_folder: Path,
                         signals_alias_path: dict[tuple[str, str], tuple[str, ...]],
                         outputs_alias_path: dict[tuple[str, str], tuple[str, ...]]) -> 'FactSpecification':
        """
        Factory to create specification by loading details from a fact XMl file
        :param xml_fname: The path to the xml file
        :param facts_root_folder: The folder inside fact-content where all facts exists.
        :param signals_alias_path: A dictionary with the signal aliases and the full path in layout
        :param outputs_alias_path: A dictionary with the output aliases and the full path in layout
        :return: A newly created object.
        """

        namespaces = {
            'wo1': 'http://schema.api.fact.abc3.com/v1',
            'wo2': 'http://schema.api.fact.abc3.com/v2'

        }

        for k, v in namespaces.items():
            etree.register_namespace(k, v)

        xmldoc: etree._ElementTree = etree.parse(str(xml_fname))

        def search_xpath(path) -> List[etree._Element]:
            xp = etree.XPath(path, namespaces=namespaces)
            return xp(xmldoc)

        def create_attr_from_el(el: etree._Element, base_class,
                                *, field_converters: Optional[Dict[str, Callable]] = None,
                                fields_modifier: Optional[Callable[[dict[str, Any]], None]] = None):
            """
            Create an attributes objects by using all the properties of an XML element
            :param el: The element
            :param base_class: The attribute class to populate
            :param field_converters: Callables to be applied on non-None field values mapped by the target field name.
            :param fields_modifier: A callable to perform in place modification to the final kwargs just
                before instantiating the object
            :return: The newly created object.
            """
            if not field_converters:
                field_converters = {}
            kwargs = {
                key: el.attrib.get(key, None)
                for key in attr.fields_dict(base_class)
            }
            for k, v in kwargs.items():
                if k in field_converters and v is not None:
                    kwargs[k] = field_converters[k](v)

            if fields_modifier:
                fields_modifier(kwargs)

            return base_class(**kwargs)

        def iter_sub_list(first_node, second_node) -> List[etree._Element]:
            return search_xpath(f'//wo1:{first_node}/wo1:{second_node}|//wo2:{first_node}/wo2:{second_node}')

        def safe_strip_text(txt: Union[str, None]) -> str:
            if not txt:
                return ""
            else:
                return txt.strip()

        name = search_xpath("wo1:name|wo2:name")[0].text.strip()
        description = safe_strip_text(search_xpath("wo1:description|wo2:description")[0].text)

        products_type = {
            Product[el.attrib['name'].upper()]: el.attrib['type']
            for el in iter_sub_list('products', 'product')
        }

        def enrichement_modifier(fields: dict[str, Any]):
            if fields.get('keys'):
                fields['keys'] = fields['keys'].split(' ')

        enrichments = {
            el.attrib['name']: create_attr_from_el(el, FactEnrichment,
                                                   fields_modifier=enrichement_modifier)
            for el in iter_sub_list('enrichments', 'enrichment')
        }

        def output_modifier(kwargs):
            kwargs['layout_path'] = outputs_alias_path[(name, kwargs['name'])]

        outputs = {
            el.attrib['name']: create_attr_from_el(el, FactOutput, fields_modifier=output_modifier)
            for el in iter_sub_list('outputs', 'output')
        }

        decisions = {
            el.attrib['name']: create_attr_from_el(el, FactDecision)
            for el in iter_sub_list('decisions', 'decision')
        }

        def signal_modifier(kwargs):
            kwargs['layout_path'] = signals_alias_path[kwargs['name']]

        signals = {
            el.attrib['name']: create_attr_from_el(el, FactSignal, fields_modifier=signal_modifier)
            for el in iter_sub_list('signals', 'signal')
        }

        references = [
