import base64
from datetime import date, datetime
from io import BytesIO
import logging
from typing import Any, TYPE_CHECKING

from django.db import models
from django.utils import timezone
from django.utils.functional import cached_property
from lxml import etree

from anonymized.db import JSONField
from abc1.exceptions.abc1coop_log import SDICoopLogResponseException
from abc1.messages.payloads import SDIDocumentLog, SDIReceivedDocument
from abc1.models import SDICoopDocument
from abc1.utils.xml_e_doc_data_processor import process_info
from abc1.utils.xml_extractor import clean_date_node, extract_description, extract_errors, extract_info
import abc1_webhooks as webhooks
from utils.misc import extract_file_from_p7m

    from abc1.models import SDICoopQueue

class SDICoopLog(models.Model):
    SOAP_ACTIONS = {
        "RECEIVED_DOC": '"http://www.abc32.it/abc33/abc2"',
        "SENT_DOC": '"http://www.abc32.it/SdIabc3/abc3"',
        "RECEIVED_RESULT_NOTIFICATION": '"http://www.abc32.it/abc34/abc4"',
        "RECEIVED_REJECT_NOTIFICATION": '"http://www.abc32.it/abc34/abc5"',
        "RECEIVED_DELIVERY_NOTIFICATION": '"http://www.abc32.it/abc34/abc6"',
        "RECEIVED_NOT_DELIVERY_NOTIFICATION": '"http://www.abc32.it/abc34/abc7"',
        "RECEIVED_DEADLINE_EXPIRED_NOTIFICATION": '"http://www.abc32.it/abc34/abc8"',
    }
    created = models.DateTimeField(verbose_name="Timestamp", auto_now_add=True, db_index=True)
    we_are_client = models.BooleanField(verbose_name="Nostra richiesta")
    soap_action = models.CharField(verbose_name="Azione SOAP", max_length=255)
    request = models.TextField(verbose_name="Richiesta")
    response = models.TextField(verbose_name="Risposta", blank=True)
    filename = models.CharField(verbose_name="Nome file", max_length=255, blank=True)
    abc1_id = models.BigIntegerField(verbose_name="Identificativo SdI", blank=True, null=True)
    abc1coop_document = models.ForeignKey(
        SDICoopDocument,
        verbose_name="Documento SDICoop",
        related_name="abc1coop_logs",
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
    )
    document_kind = models.CharField(verbose_name="Tipo documento", max_length=255, blank=True)
    sent_counter = models.CharField(verbose_name="Progressivo invio", max_length=255, blank=True)
    sender_vat = models.CharField(verbose_name="P.IVA cedente prestatore", max_length=255, blank=True)
    sender_ssn = models.CharField(verbose_name="Codice fiscale cedente prestatore", max_length=255, blank=True)
    recipient_vat = models.CharField(verbose_name="P.IVA cessionario committente", max_length=255, blank=True)
    recipient_ssn = models.CharField(verbose_name="Codice fiscale cessionario committente", max_length=255, blank=True)
    e_doc_number = models.CharField(verbose_name="Numero documento elettronico", max_length=255, blank=True)
    e_doc_date = models.DateField(verbose_name="Data documento elettronico", blank=True, null=True)
    status = models.CharField(
        verbose_name="Stato", choices=DocumentStatus.choices, max_length=DocumentStatus.max_length, blank=True
    )
    errors = JSONField(verbose_name="Errori", blank=True, default=list)

    @property
    def created_date(self) -> date:
        return timezone.localtime(self.created).date()

    def has_e_error_code(self, code: str) -> bool:
        return any([error["code"] == code for error in self.errors])

    @property
    def filename_ext(self) -> str:
        return self.filename.split(".")[-1].lower()

    @property
    def receipt_filename(self) -> str:
        # filename can be: ".xml" or ".xml.p7m"
        return "{}.pdf".format(self.filename[0 : self.filename.find(".xml")])

    @property
    def file(self) -> bytes | None:
        try:
            xml_request = etree.parse(BytesIO(self.request.encode()), parser=etree.XMLParser(huge_tree=True))
            return base64.b64decode(xml_request.xpath("//File")[0].text)
        except:
            # Return manually recovered xml of notification, missed because of our SDI server prolonged offline status
            # (We have no way to recover SOAP header)
            if self.request.startswith("<?xml "):
                return self.request.encode("utf-8")
            return None

    @property
    def xml_from_p7m(self) -> bytes | None:
        if not self.filename.lower().endswith(".xml.p7m"):
            return None
        file_from_p7m = extract_file_from_p7m(self.file)
        if file_from_p7m is None:
            # Extract after b64 decoding, see SQB-739 for details
            file_from_p7m = extract_file_from_p7m(base64.b64decode(self.file))
        return file_from_p7m

    @property
    def soap_action_name(self) -> str:
        return self.soap_action.split("/")[-1][:-1]

    @property
    def is_received_doc(self) -> bool:
        return self.soap_action == self.SOAP_ACTIONS["RECEIVED_DOC"]

    @property
    def is_sent_doc(self) -> bool:
        return self.soap_action == self.SOAP_ACTIONS["SENT_DOC"]

    @property
    def is_received_result_notification(self) -> bool:
        return self.soap_action == self.SOAP_ACTIONS["RECEIVED_RESULT_NOTIFICATION"]

    @property
    def is_received_reject_notification(self) -> bool:
        return self.soap_action == self.SOAP_ACTIONS["RECEIVED_REJECT_NOTIFICATION"]

    @property
    def is_received_delivery_notification(self) -> bool:
        return self.soap_action == self.SOAP_ACTIONS["RECEIVED_DELIVERY_NOTIFICATION"]

    @property

    @cached_property  # noqa: C901
    def xml_e_doc_data(self):
        if self.is_received_doc or self.is_sent_doc:
            abc1coop_log = self
        else:
            abc1coop_log = SDICoopLog.objects.get(abc1_id=self.abc1_id, soap_action=SDICoopLog.SOAP_ACTIONS["SENT_DOC"])
        data = extract_info(abc1coop_log.xml, recover=True)
        data = process_info(data)
        data["abc1coop_log_id"] = self.id
        return data

        from abc1.models import SDICoopQueue

        from abc1.models import SDICoopQueue
