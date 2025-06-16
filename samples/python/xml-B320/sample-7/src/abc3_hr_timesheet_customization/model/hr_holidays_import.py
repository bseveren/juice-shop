from openerp.osv import osv
from openerp.tools import DEFAULT_SERVER_DATETIME_FORMAT as DTF
import logging
import urllib2
from lxml import etree
from datetime import datetime, timedelta
import pytz

class hr_holidays_import(osv.TransientModel):
    _name = 'hr.holidays.import'
    _logger = logging.getLogger('hr.holidays.import')

    def import_absences(self, cr, uid, start_date=None, context=None):
        res = self.import_absences_abc3(cr, uid, start_date=start_date, context=context)
        res = self.import_absences_mbc(cr, uid, start_date=start_date, context=context)
        return res
   
    def import_absences_mbc(self, cr, uid, start_date=None, context=None):
        context = context or {}

        user = self.pool.get('res.users').browse(cr, uid, uid, context=context)

        tz_name = context.get('tz', False) or user.tz or 'UTC'
        local_tz = pytz.timezone(tz_name)
        utc_tz = pytz.utc

        yesterday = (datetime.now(tz=local_tz) - timedelta(days=1)).strftime('%Y%m%d')
        date_from = yesterday
        if start_date:
            date_from = datetime.strptime(start_date, '%Y-%m-%d').strftime('%Y%m%d')
        url = 'http://www.abc1.eu/Personeel/ExportAbsences?from=%s&until=%s' % (date_from, yesterday)

        # Set language to nl_BE
        nl_ctx = context.copy()
        nl_ctx.update({'lang': 'nl_BE'})
        fr_ctx = context.copy()
        fr_ctx.update({'lang': 'fr_BE'})

        self._logger.info('Opening %s' % url)

        # Get absence types and group by name
        holiday_status_obj = self.pool.get('hr.holidays.status')
        holiday_status_ids = holiday_status_obj.search(cr, uid, [], context=nl_ctx)
        holiday_statuses = {}
        for holiday_status in holiday_status_obj.read(cr, uid, holiday_status_ids, ['name'], context=nl_ctx):
            holiday_statuses[holiday_status['name']] = holiday_status['id']

        # Get employees
        hr_employee_obj = self.pool.get('hr.employee')
        employee_ids = hr_employee_obj.search(cr, uid, [('otherid', '!=', False)])
        employees = {}
        for employee in hr_employee_obj.read(cr, uid, employee_ids, ['otherid'], context=nl_ctx):
            employees[employee['otherid']] = employee['id']

        # Read XML content
        xml_file = urllib2.urlopen(url)
        data = xml_file.read()
        xml_file.close()

        self._logger.info('Parsing XML data')

        data = data.replace('encoding="utf-16"', 'encoding="utf-8"')

        xml_data = etree.fromstring(data)
        xml_absences = xml_data.xpath('//Absence')

        holidays_to_validate = []
        holiday_obj = self.pool.get('hr.holidays')

        for xml_absence in xml_absences:
            absence = {}
            for child in xml_absence:
                absence[child.tag] = child.text

            other_id = absence.get('EmployeeId', False)
            employee_name = absence.get('EmployeeName', False)
            abs_date_str = absence.get('Date', '')
            abs_type = absence.get('TypeOfAbsence', '')
            abs_hours = absence.get('Time', False)

            abs_types = abs_type.split('/', 2)
            abs_type_fr = ''
            if abs_types:
                abs_type_nl = abs_types[0]
                if len(abs_types) > 1:
                    abs_type_fr = abs_types[1]
            else:
                continue

            if not other_id or not abs_date_str or not abs_type_nl or not abs_hours:
                continue

            if other_id not in employees:
                self._logger.info('External ID %s for %s not linked to any employee!' % (other_id, employee_name))
                continue

            abs_date = datetime.strptime(abs_date_str, '%d/%m/%Y')
            abs_start = local_tz.localize(abs_date.replace(hour=8, minute=0, second=0)).astimezone(utc_tz)
            abs_end = (abs_start + timedelta(hours=float(abs_hours))).strftime(DTF)
            abs_start = abs_start.strftime(DTF)

            # When absence type not found, add it
            abs_type_id = holiday_statuses.get(abs_type_nl, False)
            if not abs_type_id:
                abs_type_id = holiday_status_obj.create(cr, uid, {
                    'name': abs_type_nl,
                    'color_name': 'blue'
                }, context=nl_ctx)
                holiday_statuses[abs_type_nl] = abs_type_id

    def import_absences_abc3(self, cr, uid, start_date=None, context=None):
        context = context or {}

        user = self.pool.get('res.users').browse(cr, uid, uid, context=context)

        tz_name = context.get('tz', False) or user.tz or 'UTC'
        local_tz = pytz.timezone(tz_name)
        utc_tz = pytz.utc

        yesterday = (datetime.now(tz=local_tz) - timedelta(days=1)).strftime('%Y%m%d')
        date_from = yesterday
        if start_date:
            date_from = datetime.strptime(start_date, '%Y-%m-%d').strftime('%Y%m%d')
        url = 'http://www.abc3tools.eu/Personeel/ExportAbsences?from=%s&until=%s' % (date_from, yesterday)

        # Set language to nl_BE
        nl_ctx = context.copy()
        nl_ctx.update({'lang': 'nl_BE'})
        fr_ctx = context.copy()
        fr_ctx.update({'lang': 'fr_BE'})

        self._logger.info('Opening %s' % url)

        # Get absence types and group by name
        holiday_status_obj = self.pool.get('hr.holidays.status')
        holiday_status_ids = holiday_status_obj.search(cr, uid, [], context=nl_ctx)
        holiday_statuses = {}
        for holiday_status in holiday_status_obj.read(cr, uid, holiday_status_ids, ['name'], context=nl_ctx):
            holiday_statuses[holiday_status['name']] = holiday_status['id']

        # Get employees
        hr_employee_obj = self.pool.get('hr.employee')
        employee_ids = hr_employee_obj.search(cr, uid, [('otherid', '!=', False)])
        employees = {}
        for employee in hr_employee_obj.read(cr, uid, employee_ids, ['otherid'], context=nl_ctx):
            employees[employee['otherid']] = employee['id']

        # Read XML content
        xml_file = urllib2.urlopen(url)
        data = xml_file.read()
        xml_file.close()

        self._logger.info('Parsing XML data')

        data = data.replace('encoding="utf-16"', 'encoding="utf-8"')

        xml_data = etree.fromstring(data)
        xml_absences = xml_data.xpath('//Absence')

        holidays_to_validate = []
        holiday_obj = self.pool.get('hr.holidays')

        for xml_absence in xml_absences:
            absence = {}
            for child in xml_absence:
                absence[child.tag] = child.text

            other_id = absence.get('EmployeeId', False)
            employee_name = absence.get('EmployeeName', False)
            abs_date_str = absence.get('Date', '')
            abs_type = absence.get('TypeOfAbsence', '')
            abs_hours = absence.get('Time', False)

            abs_types = abs_type.split('/', 2)
            abs_type_fr = ''
            if abs_types:
                abs_type_nl = abs_types[0]
                if len(abs_types) > 1:
                    abs_type_fr = abs_types[1]
            else:
                continue

            if not other_id or not abs_date_str or not abs_type_nl or not abs_hours:
                continue

            if other_id not in employees:
                self._logger.info('External ID %s for %s not linked to any employee!' % (other_id, employee_name))
                continue

            abs_date = datetime.strptime(abs_date_str, '%d/%m/%Y')
            abs_start = local_tz.localize(abs_date.replace(hour=8, minute=0, second=0)).astimezone(utc_tz)
            abs_end = (abs_start + timedelta(hours=float(abs_hours))).strftime(DTF)
            abs_start = abs_start.strftime(DTF)

            # When absence type not found, add it
            abs_type_id = holiday_statuses.get(abs_type_nl, False)
            if not abs_type_id:
                abs_type_id = holiday_status_obj.create(cr, uid, {
                    'name': abs_type_nl,
                    'color_name': 'blue'
                }, context=nl_ctx)
                holiday_statuses[abs_type_nl] = abs_type_id

                # Update fr name
                if abs_type_fr:
                    holiday_status_obj.write(cr, uid, [abs_type_id], {
                        'name': abs_type_fr
                    }, context=fr_ctx)

            search_holiday_ids = holiday_obj.search(cr, uid, [
                ('date_from', '<=', abs_end),
