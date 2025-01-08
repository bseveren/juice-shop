class SectionValuePrettyFormatter(object):

    def pformat(self, value, value_format, event_record):
        return getattr(self, '_pformat_' + value_format)(value, event_record)

    def _pformat_timestamp(self, event_timestamp, event_record=None):
        return datetime.datetime.fromtimestamp(
            event_timestamp/1000.0).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]

    def _pformat_dictionary(self, obj, event_record=None):
        return json.dumps(obj=obj, sort_keys=True, indent=4)

    def _pformat_http_body(self, body, event_record):
        if not body:
            return 'There is no associated body'
        elif event_record['payload'].get('streaming', False):
            return 'The body is a stream and will not be displayed'
        elif self._is_xml(body):
            # TODO: Figure out a way to minimize the number of times we have
            # to parse the XML. Currently at worst, it will take three times.
            # One to determine if it is XML, another to strip whitespace, and
            # a third to convert to make it pretty. This is an issue as it
            # can cause issues when there are large XML payloads such as
            # an s3 ListObjects call.
            return self._get_pretty_xml(body)
        elif self._is_json_structure(body):
            return self._get_pretty_json(body)
        else:
            return body

    def _get_pretty_xml(self, body):
        # The body is parsed and whitespace is stripped because some services
        # like ec2 already return pretty XML and if toprettyxml() was applied
        # to it, it will add even more newlines and spaces on top of it.
        # So this just removes all whitespace from the start to prevent the
        # chance of adding to much newlines and spaces when toprettyxml()
        # is called.
        stripped_body = self._strip_whitespace(body)
        xml_dom = xml.dom.minidom.parseString(stripped_body)
        return xml_dom.toprettyxml(indent=' '*4, newl='\n')
