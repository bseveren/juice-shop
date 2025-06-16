from lxml import etree

from gdata.contacts import ContactsFeedFromString

from app_server.contacts.models import SoContact, GMAIL_CONTACT
from app_server.contact_importer import providers
import app_server.email.utils as email_utils

class GmailContactsImporter(providers.GoogleContactImporter):
    def __init__(self, client_id, client_secret, redirect_url):
        super(GmailContactsImporter, self).__init__(client_id, client_secret, redirect_url)

    def parse_contacts_old(self, contacts_xml=None):
        contacts = None
        if contacts_xml is not None:
            contacts = ContactsFeedFromString(contacts_xml)
        return contacts

    def _get_first_last_name(self, name_elem):
        fullname = None
        firstname = None
        lastname = None

        if name_elem is not None:
            for sub_elem in name_elem:

                if sub_elem.tag == "{http://schemas.google.com/g/2005}fullName":
                    fullname = sub_elem.text
                if sub_elem.tag == "{http://schemas.google.com/g/2005}givenName":
                    firstname = sub_elem.text
                if sub_elem.tag == "{http://schemas.google.com/g/2005}familyName":
                    lastname = sub_elem.text

        return fullname, firstname, lastname

    def parse_contact_from_entry(self, entry_xml_node):
        name_elem = entry_xml_node.find("{http://schemas.google.com/g/2005}name")
        email_elem = entry_xml_node.find("{http://schemas.google.com/g/2005}email")

        if email_elem is not None:
            fullname, firstname, lastname = self._get_first_last_name(name_elem)
            email = email_elem.attrib.get('address')

            if not email_utils.validate_email(email):
                return None

            return SoContact(fullname=fullname,
                             firstname=firstname,
                             lastname=lastname,
                             email=email,
                             type=GMAIL_CONTACT)
        else:
            return None

    def parse_contacts(self, contacts_xml=None):
        parser = etree.XMLParser(ns_clean=True, recover=True, encoding="utf-8")
        root = etree.fromstring(contacts_xml.encode("utf-8"), parser)
        elms = root.findall("{http://www.w3.org/2005/Atom}entry")
        contacts = []

        for elm in elms:
            contact = self.parse_contact_from_entry(elm)
            if contact:
                contacts.append(contact)

        return contacts
