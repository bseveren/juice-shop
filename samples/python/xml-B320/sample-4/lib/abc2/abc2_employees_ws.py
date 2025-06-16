import copy
from datetime import datetime
from typing import Any

from django.conf import settings
from django.utils.translation import gettext as _
from requests.exceptions import RequestException
from result import Result
from zeep.exceptions import Fault, TransportError, ValidationError
from zeep.helpers import serialize_object

from lib.comun.medical_licenses_ws import abc4
from lib.dicttoxml import dicttoxml
from lib.abc2.constants import BASE_URL, ZONE_C
from lib.abc2.utils import (
    get_status_from_message,
    parse_date_to_xml_string,
    save_xml_to_file,
)
from rexing.utils.electronic_medical_license import (
    get_afp_affiliation_date,
    get_afp_code_and_name,
    get_ccaf_or_oa_codes,
    get_comuna_code,
    get_occupation_code,
    get_payment_entity_code,
    get_quality_worker_type_code,
)

class abc11EmployeesWebServices(abc4):
    wsdl_url = BASE_URL[settings.ENVIRONMENT]

    @staticmethod
    def parse_response(response, xml_request=None, xml_response=None):
        status = 'Error'
        message = 'Error inesperado'
        obj = None

        if 'Estado' in response:
            status = 'Error' if response['Estado'] == 1 else 'OK'
        if 'GloEstado' in response:
            message = response.get('GloEstado')
        if 'ListaEstados' in response:
            obj = response.get('ListaEstados')
        if 'DctoLme' in response:
            obj = response.get('DctoLme')
        if 'DireccionAdjunto' in response:
            obj = response.get('DireccionAdjunto')
        if not obj:
            obj = response

        status = get_status_from_message(status, message)

        return status, message, obj, xml_request, xml_response

    @classmethod
    def get_error_response(cls, action, error):
        error_message = f'Error {action}: {str(error)}'
        return cls.parse_response({
            'Estado': 1,
            'GloEstado': error_message,
            'ListaEstados': []
        })

    @staticmethod
    def build_c_zone(a_license, abc9_company, abc9_employee, abc9_contract,
                     attachments, previous_licenses):
        """
        Build C Zone to inform to abc1:
        ### PARAMETERS:
        - a_license (dict): the information of the license from abc1 Web
                            Service
        - abc9_company (abc5): Information related to company for
                                      complete zone C information
        - abc9_employee (abc6): Information related to employee for
                                        complete zone C information
        - abc9_contract (abc7): Information related to contract for
                                        complete zone C information
        - attachments (list): list of dictionaries with format -> {
            file_type (int): the file type as abc10 code,
            document_name (string): the name of the file,
            document (bytes): the file in BytesIO,
            url (string): the url that abc10 give of the upload file, start ''
        }
        - previous_licenses (list or None): A list of abc8 or
                                            None

        ### RETURNS:
        - Zone C (string): XML zone C as String
        """
        afp_code, afp_name = get_afp_code_and_name(
            abc9_employee.afp, abc9_employee.retired, abc9_employee.expatriate
        )
        payment_entity_code, payment_entity_name = get_payment_entity_code(
            abc9_employee.health_institution,
            abc9_contract.compensation_box,
            a_license['license_type']
        )

        occupation_code = get_occupation_code(abc9_contract.occupation)

        zone_c = copy.deepcopy(ZONE_C)

        # Zona C1
        zone_c['ZONA_C1']['emp_nombre'] = abc9_company.name
        zone_c['ZONA_C1']['emp_rut'] = abc9_company.rut
        zone_c['ZONA_C1']['emp_telefono']['telefono'] = abc9_company.phone
        zone_c['ZONA_C1']['emp_fecha_recepcion'] = \
            datetime.strptime(a_license['emition_date'], '%d/%m/%Y')
        zone_c['ZONA_C1']['emp_direccion']['calle'] = abc9_contract.address
        zone_c['ZONA_C1']['emp_direccion']['numero'] = ''
        zone_c['ZONA_C1']['emp_direccion']['comuna'] = get_comuna_code(
            abc9_contract.city)
        zone_c['ZONA_C1']['emp_direccion']['pais'] = 'CHILE'
        zone_c['ZONA_C1']['codigo_actividad_laboral'] = \
            abc9_company.laboral_activity_code
        zone_c['ZONA_C1']['codigo_ocupacion'] = occupation_code
        zone_c['ZONA_C1']['emp_otra_ocupacion'] = abc9_employee.profession

        # Zona C2
        zone_c['ZONA_C2']['codigo_tipo_regimen_previsional'] = (
            2 if abc9_employee.pension_system == 'N' else 1
        )
        zone_c['ZONA_C2']['codigo_regimen_previsional'] = afp_code
        zone_c['ZONA_C2']['prev_nombre'] = afp_name
        zone_c['ZONA_C2']['codigo_calidad_trabajador'] = (
            get_quality_worker_type_code()
        )
        zone_c['ZONA_C2']['codigo_seguro_afc'] = (
            1 if abc9_employee.retired == '0' else 2

    @classmethod
    def inform_c_zone(
        cls,
        a_license,
        credentials,
        abc9_company,
        abc9_employee,
        abc9_contract,
        attachments,
        previous_licenses=None
    ):
        """
        Inform C zone
        ### PARAMETERS:
        - a_license (dict): the license formated ->{
            'license_number': license_number with check digit (string),
            'employee_id': employee rut with check digit (string),
            'first_name': first name (string),
            'last_name': paternal last name (string),
            'last_name_2': maternal last name (string),
            'age': age (int),
            'license_type': code of medical license (int),
            'license_type_name': 'Normal'/'Maternal' (string),
            'status': key status from LICENSE_STATES in constants.py (int),
            'status_description': value from LICENSE_STATES in constants.py
                                  (string),
            'emition_date': date with format '%d/%m/%Y' (string),
            'start_rest_date': date with format '%d/%m/%Y' (string),
            'amount_licenses_days': amount of days of the license (int),
            'doctor_id': doctor rut with check digit (string),
            'doctor_first_name': doctor first name (string),
            'doctor_last_name': doctor paternal last name (string),
            'doctor_last_name_2': doctor maternal last name (string),
            'salaries': list of dictionaries with format -> {
                'type': 'base_salary' or 'salary' (string),
                'value': amount of the salary (int),
                'month': month or process as YYYY-AA (string),
                'worked_days': worked days (int),
                'absent_days': absent days (int),
            },
        }
        - credentials (string): abc1 password
        - abc9_company (abc5): Information related to company for
                                    complete zone C information
        - abc9_employee (abc6): Information related to employee for
                                      complete zone C information
        - abc9_contract (abc7): Information related to contract for
                                      complete zone C information
        - attachments (dict): dictionary with the information of the
                              attachments
        - previous_licenses (list or None): A list of abc8 or
                                            None

        ### RETURNS:
        - status (string): 'Error' or 'OK'
        - message (string): a detail message that explain the status
        - obj: None
        """
        try:
            client = cls.get_client()
        except CACHED_ERRORS as error:
            return cls.get_error_response(GETTING_abc10_CLIENT, error)

        zone_c = cls.build_c_zone(
            a_license, abc9_company, abc9_employee, abc9_contract,
            attachments, previous_licenses)

        company_id = abc9_company.rut.split('-')

        request_data = {
            'CodigoOperador': '3',
            'RutEmpleador': int(company_id[0]),
            'DvEmpleador': company_id[1],
            'IdUnidadrrhh': '',
            'Clave': credentials,
            'TipoFormulario': '3',
            'IdLicencia': a_license['license_number'].split('-')[0],
            'DvLicencia': a_license['license_number'].split('-')[1],
            'FecProceso': parse_date_to_xml_string(
                datetime.now(), with_time=True
            ),
            'DatosZonaC': zone_c,
            'MotivoNoRecepcion': 0,
        }

        try:
            # save raw XML in file
            message = client.create_message(
                client.service,
                'LMEInfSeccC',
                request_data
            )

            xml_request = save_xml_to_file(message)

            # make the zeep request
            response = client.service.LMEInfSeccC(request_data)

            # save raw XML response in file
            xml_response = save_xml_to_file(
                response,
                'response'
            )
        except CACHED_ERRORS as error:
            return cls.get_error_response('informando abc10', error)
        response_data = serialize_object(response, target_cls=dict)
        cls.add_api_registry(
            url=cls.wsdl_url + '/LMEInfSeccC',
            data=request_data,
            response=response_data,
        )
