from lxml import etree
import sys
import re
import doctest
try:
    from html import escape as html_escape
except ImportError:
    from cgi import escape as html_escape

def html_fromstring(html):
    return etree.fromstring(html, _html_parser)

            import sys

    import sys

    import doctest
