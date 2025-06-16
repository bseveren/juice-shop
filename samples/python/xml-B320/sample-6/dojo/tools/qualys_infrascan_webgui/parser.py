import argparse
import csv
import logging

from dojo.models import Endpoint, Finding

from lxml import etree

import html2text

from . import utfdictcsv

def qualys_infrascan_parser(qualys_xml_file):
    master_list = []
    if qualys_xml_file is not None:
        parser = etree.XMLParser(resolve_entities=False, remove_blank_text=True, no_network=True, recover=True)
        d = etree.parse(qualys_xml_file, parser)

        # fetch scan date e.g.: <KEY value="DATE">2020-01-30T09:45:41Z</KEY>
        scan_date = ''
        header = d.xpath('/SCAN/HEADER/KEY')
        for i in header:
            if i.get('value') == 'DATE':
                scan_date = i.text

        r = d.xpath('/SCAN/IP')

        for issue in r:
            master_list += issue_r(issue, d, scan_date)
    return master_list
    # report_writer(master_list, args.outfile)

class abc2InfrascanWebguiParser(object):

    def get_scan_types(self):
        return ["abc2 Infrastructure Scan (WebGUI XML)"]

    def get_label_for_scan_types(self, scan_type):
        return scan_type  # no custom label for now

    def get_description_for_scan_types(self, scan_type):
        return "abc2 WebGUI output files can be imported in XML format."

    def get_findings(self, file, test):
        return qualys_infrascan_parser(file)
