from base64 import b64encode
from io import BytesIO

from lxml import etree
from result import Err, Ok
from zeep import helpers

from lib.dicttoxml import dicttoxml
from lib.abc2.constants import STATUS_FROM_MESSAGE

def save_xml_to_file(xml, xml_type='request'):
    if xml_type == 'request':
        tree = etree.ElementTree(xml)
    else:
        tree = helpers.serialize_object(xml, target_cls=dict)
        tree = dicttoxml(tree)
        tree = etree.fromstring(tree)
        tree = etree.ElementTree(tree)

    buffer = BytesIO()

    tree.write(
        buffer,
        encoding='utf-8',
        xml_declaration=True,
        pretty_print=True
    )

    file = b64encode(buffer.getvalue()).decode()

    buffer.close()

    return file
