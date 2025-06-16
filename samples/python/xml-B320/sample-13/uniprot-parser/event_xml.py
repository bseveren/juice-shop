# *-* coding: utf-8 *-*

"""\
This takes a uniprot_sprot|trembl.xml file, or a path to a split of the same, and creates a mapping file.

"""

from os import listdir
from os.path import isfile, join
import sys

from lxml import etree


class ParserTarget:
    current_type = None
    first_name = False
    name = None
    accessions = []
    sequence = ''
    def data(self, data_):
        data_ = data_.strip()
        if data_ is None or data_ == '':
            return
        if self.current_type == 'sequence':
            #print('data:%s' % data_)
            self.sequence = self.sequence + data_
        elif self.current_type == 'name':
            self.name = data_
        elif self.current_type == 'accession':
            self.accessions.append(data_)
 
    def start(self, tag, attrib):
        if tag.endswith('name') or tag.endswith('accession') or tag.endswith('sequence'):
            # print('tag: ' + tag)
            if tag.endswith('name'):
                if self.first_name is True:
                    return
                self.current_type = 'name'
                self.first_name = True
            elif tag.endswith('sequence'):
                self.current_type = 'sequence'
            else:
                self.current_type = 'accession'

    def end(self, tag):
        if tag.endswith("entry"):
            print(','.join(["%".join(self.accessions), self.name, self.sequence]))
            self.name = None
            self.accessions.clear()
            self.sequence = ''
            self.first_name = False
        self.current_type = None
            
    def close(self):
        pass

    
def main(path):
    if isfile(path):
        files = [path]
    else:
        files = [join(path, f) for f in listdir(path) if isfile(join(path, f))]
    for filename in files:
        parser_target = ParserTarget()
        parser = etree.XMLParser(target=parser_target)
        events = etree.parse(filename, parser=parser)


if __name__ == "__main__":
    main(sys.argv[1])
