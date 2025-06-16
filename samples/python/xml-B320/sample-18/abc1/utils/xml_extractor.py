from decimal import Decimal

from lxml import etree

def extract_info(xml, fail_silently=True, recover=False):  # noqa: C901
    """
    Extracts information from an XML document.

    Args:
        xml (str): The XML document.
        fail_silently (bool, optional): Whether to return an empty data dictionary if
        an exception occurs during parsing. Defaults to True.
        recover (bool, optional): Whether to recover from XML parsing errors. Defaults to False.

    Returns:
        dict: A dictionary containing the extracted information.
    """
    data = {"e_doc_data": {}, "sender": {}, "recipient": {}}
    try:
        root = etree.fromstring(xml, parser=etree.XMLParser(recover=recover, huge_tree=True))
    except:
        if fail_silently:
            return data
        raise
    else:
        # abc9 nodes
        is_fpa_node = root.find(".//abc9/abc10")
        sent_counter_node = root.find(".//abc9/ProgressivoInvio")

        # abc11 nodes
        sender_vat_node = root.find(".//abc11/abc12/abc22/abc23")
        sender_ssn_node = root.find(".//abc11/abc12/abc20")
        sender_professional_register_node = root.find(".//abc11/abc12/abc16")
        sender_business_name_node = root.find(".//abc11/abc12/Anagrafica/abc17")
        sender_first_name_node = root.find(".//abc11/abc12/Anagrafica/Nome")
        sender_last_name_node = root.find(".//abc11/abc12/Anagrafica/Cognome")
        sender_building_address_node = root.find(".//abc11/abc13/abc31")
        sender_building_street_number_node = root.find(".//abc11/abc13/NumeroCivico")
        sender_building_postcode_node = root.find(".//abc11/abc13/abc18")
        sender_building_municipality_node = root.find(".//abc11/abc13/Comune")
        sender_building_province_node = root.find(".//abc11/abc13/Provincia")
        sender_building_country_node = root.find(".//abc11/abc13/Nazione")
        sender_office_address_node = root.find(".//abc11/abc14/abc31")
        sender_office_street_number_node = root.find(".//abc11/abc14/NumeroCivico")
        sender_office_postcode_node = root.find(".//abc11/abc14/abc18")
        sender_office_municipality_node = root.find(".//abc11/abc14/Comune")
        sender_office_province_node = root.find(".//abc11/abc14/Provincia")
        sender_office_country_node = root.find(".//abc11/abc14/Nazione")
        sender_phone_node = root.find(".//abc11/abc15/Telefono")
        sender_fax_node = root.find(".//abc11/abc15/Fax")
        sender_email_node = root.find(".//abc11/abc15/Email")

        # abc19 nodes
        recipient_vat_node = root.find(".//abc19/abc12/abc22/abc23")
        recipient_ssn_node = root.find(".//abc19/abc12/abc20")

        # abc21 nodes
        document_kind_node = root.find(".//abc21/TipoDocumento")
        e_doc_number_node = root.find(".//abc21/Numero")
        welfare_code_node = root.find(".//abc21/abc27/TipoCassa")
        welfare_amount_node = root.find(".//abc21/abc27/abc25")
        taxable_withholding_tax_node = root.find(".//abc24")
        welfare_taxable_node = root.find(".//abc25")
        amount_node = root.find(".//abc26")
        currency_node = root.find(".//abc21/Divisa")
        date_node = root.find(".//abc21/Data")

        # abc28 nodes
        subject_node = root.find(".//abc28/abc29/Descrizione")
        rows = []
        for row_node in root.findall(".//abc28/abc29"):
            row = {}
            for row_element in row_node:
                row[row_element.tag] = row_element.text.strip() if row_element.text is not None else ""
            rows.append(row)
        data["e_doc_data"]["rows"] = rows

        # abc30 nodes
        payment_date_node = root.find(".//abc30/abc35")

        # init data structure
        if sender_vat_node is not None:
            data["sender"]["vat"] = sender_vat_node.text
        if sender_ssn_node is not None:
            data["sender"]["ssn"] = sender_ssn_node.text
        data["sender"]["id"] = None
        if sender_vat_node is not None and sender_professional_register_node is not None:
            data["sender"]["typology"] = "PROF"
        if sender_business_name_node is not None:
            data["sender"]["business_name"] = sender_business_name_node.text
        if sender_first_name_node is not None:
            data["sender"]["first_name"] = sender_first_name_node.text
        if sender_last_name_node is not None:
            data["sender"]["last_name"] = sender_last_name_node.text
        if sender_office_address_node is not None:
            if sender_office_street_number_node is not None:
                data["sender"]["address"] = "{} {}".format(
                    sender_office_address_node.text, sender_office_street_number_node.text
                )
            else:
                data["sender"]["address"] = sender_office_address_node.text
        if sender_office_postcode_node is not None:
            data["sender"]["postcode"] = sender_office_postcode_node.text
        if sender_office_municipality_node is not None:
            data["sender"]["municipality"] = sender_office_municipality_node.text
        if sender_office_province_node is not None:
            data["sender"]["province"] = sender_office_province_node.text
        if sender_office_country_node is not None:
            data["sender"]["country"] = sender_office_country_node.text
        if sender_building_address_node is not None:
            if sender_building_street_number_node is not None:
                data["sender"]["address"] = "{} {}".format(
                    sender_building_address_node.text, sender_building_street_number_node.text
                )
            else:
                data["sender"]["address"] = sender_building_address_node.text
        if sender_building_postcode_node is not None:
            data["sender"]["postcode"] = sender_building_postcode_node.text
