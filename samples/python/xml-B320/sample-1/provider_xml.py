import MySQLdb
import logging
import logging.config
from connect import Connect
import defusedxml.ElementTree as etree

class ProviderXML:
    """Provider XML operations"""

    def insert(self, provider_xml):

        parser = etree.DefusedXMLParser(
            # disallow XML with a <!DOCTYPE> processing instruction
            forbid_dtd=True,
            # disallow XML with <!ENTITY> declarations inside the DTD
            forbid_entities=True,
            # disallow any access to remote or local resources in external entities or DTD
            forbid_external=True
        )
        try:
            tree = etree.parse(provider_xml, parser=parser)
        except (etree.ParseError, ValueError) as e:
            logger.error('XML parse error - %s' % e)
            raise ValueError(e) from e
        provider = tree.getroot()

        try:
            conn = Connect()
            cursor = conn.db.cursor()
            cursor.execute(
                """
                INSERT INTO providers (name, address, phone)
                    VALUES (%(name)s, %(address)s, %(phone)s)
                """,
                {
                    'name': provider.find('name').text,
                    'address': provider.find('address').text,
                    'phone': provider.find('phone').text
                }
            )
            conn.db.commit()
            logger.info('Provider %02d inserted' % cursor.lastrowid)
        except MySQLdb.MySQLError as e:
            logger.error('Could not insert provider: %s' % e)
        finally:
            conn.db.close()
