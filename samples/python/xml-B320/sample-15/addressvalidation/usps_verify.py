from urllib.request import urlopen
import urllib

from lxml import etree
try:
    from collections import OrderedDict
except ImportError:
    from ordereddict import OrderedDict

def _get_response(xml):
    params = OrderedDict([
            ('API', 'Verify'),
            ('XML', etree.tostring(xml)),
            ])
    url = '{api_url}?{params}'.format(
        api_url=api_url,
        params=urllib.parse.urlencode(params),
        )

    res = urlopen(url)
    res = etree.parse(res)

    return res

def verify(user_id, *args):
    xml = _create_xml(user_id, *args)
    res = _get_response(xml)
    res = _parse_response(res)

    return res
