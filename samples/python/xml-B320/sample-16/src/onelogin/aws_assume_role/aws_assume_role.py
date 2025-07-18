import argparse
import base64
import boto3
import botocore.client
import getpass
import json
import os
import sys
import time

from base64 import b64decode
from botocore.exceptions import ClientError
from datetime import datetime
from lxml import etree as ET
from onelogin.api.client import OneLoginClient

    from aws_assume_role.writer import ConfigFileWriter
    from aws_assume_role.accounts import process_account_and_role_choices
except ImportError:
    from writer import ConfigFileWriter
    from accounts import process_account_and_role_choices

def get_attributes(saml_response):
    if not saml_response:
        return {}

    saml_response_xml = base64.b64decode(saml_response)
    saml_response_elem = ET.fromstring(saml_response_xml)
    NSMAP = {
        'samlp': 'urn:oasis:names:tc:SAML:2.0:protocol',
        'saml': 'urn:oasis:names:tc:SAML:2.0:assertion'
    }
    attributes = {}
    attribute_nodes = saml_response_elem.xpath('//saml:AttributeStatement/saml:Attribute', namespaces=NSMAP)
    for attribute_node in attribute_nodes:
        attr_name = attribute_node.get('Name')
        values = []
        for attr in attribute_node.iterchildren('{%s}AttributeValue' % NSMAP['saml']):
            values.append(element_text(attr))
        attributes[attr_name] = values
    return attributes

def main():
    print("\nOneLogin AWS Assume Role Tool\n")

    options = get_options()

    client = get_client(options)

    client.get_access_token()

    mfa_verify_info = None
    role_arn = principal_arn = None
    default_aws_region = 'abc1'
    ip = None

    if hasattr(client, 'ip'):
        ip = client.ip

    profile_name = "default"
    if options.profile_name is not None:
        profile_name = options.profile_name

    if options.file is None:
        aws_file = os.path.expanduser('~/.aws/credentials')
    else:
        aws_file = options.file

    cmd_otp = None
    if options.otp:
        cmd_otp = options.otp

    config_file_writer = None
    botocore_config = botocore.client.Config(signature_version=botocore.UNSIGNED)
    ask_for_user_again = False
    ask_for_role_again = False
    sleep = False
    iterations = list(range(0, options.loop))
    duration = options.duration
    username_or_email = password = app_id = onelogin_subdomain = None
    result = None

    for i in iterations:
        if sleep:
            time.sleep(options.time * 60)
            sleep = False

            if result is not None and not is_valid_saml_assertion(b64decode(result['saml_response'])):
                result = None
        # Only use the otp provided by the command line on the first loop
        if i > 0:
            cmd_otp = None

        if options.cache_saml:
            cached_data = get_data_from_cache()
            if cached_data:
                if is_valid_saml_assertion(b64decode(cached_data['saml_response'])):
                    print("Found a valid SAML cache for the user %s" % cached_data['username_or_email'])
                    result = cached_data

                    username_or_email = result['username_or_email']
                    onelogin_subdomain = result['onelogin_subdomain']
                    mfa_verify_info = result['mfa_verify_info']
                    app_id = result['app_id']
                else:
                    print("The cached SAML expired for the user %s" % cached_data['username_or_email'])
                    if i == 0:
                        print("Reuse rest of the data?  (y/n)")
                        answer = get_yes_or_not()
                        if answer == 'y':
                            username_or_email = cached_data['username_or_email']
                            onelogin_subdomain = cached_data['onelogin_subdomain']
                            mfa_verify_info = cached_data['mfa_verify_info']
                            app_id = cached_data['app_id']
                        else:
                            clean_cache()

        # Allow user set a new profile name when switching from User or Role
        if ask_for_user_again or ask_for_role_again:
            if not (options.profile_name is None and options.file is None):
                print("Do you want to set a new profile name?  (y/n)")
                answer = get_yes_or_not()
                if answer == 'y':
                    print("Profile name: ")
                    profile_name = sys.stdin.readline().strip()

        missing_onelogin_data = username_or_email is None or password is None or app_id is None or onelogin_subdomain is None

        if ask_for_user_again:
            print("OneLogin Username: ")
            username_or_email = sys.stdin.readline().strip()

            password = getpass.getpass("\nOneLogin Password: ")
            ask_for_user_again = False
            ask_for_role_again = True
        elif result is None and missing_onelogin_data:
            # Capture OneLogin Account Details
            if username_or_email is None:
                if options.username:
                    username_or_email = options.username
                else:
                    print("OneLogin Username: ")
                    username_or_email = sys.stdin.readline().strip()

            if password is None:
                if options.password:
                    password = options.password
                else:
                    password = getpass.getpass("\nOneLogin Password: ")

            if app_id is None:
                if options.app_id:
                    app_id = options.app_id
                else:
                    print("\nAWS App ID: ")
                    app_id = sys.stdin.readline().strip()

            if options.subdomain:
                onelogin_subdomain = options.subdomain
            else:
                print("\nOnelogin Instance Sub Domain: ")
                onelogin_subdomain = sys.stdin.readline().strip()

        if result is None:
            result = get_saml_response(client, username_or_email, password, app_id, onelogin_subdomain, ip, mfa_verify_info, cmd_otp)

            username_or_email = result['username_or_email']
            password = result['password']
            onelogin_subdomain = result['onelogin_subdomain']
            mfa_verify_info = result['mfa_verify_info']

            if options.cache_saml:
                cached_content = result
                cached_content['app_id'] = app_id
                write_data_to_cache(cached_content)

        saml_response = result['saml_response']

        if i == 0 or ask_for_role_again:
            if ask_for_role_again:
                duration = options.duration

            attributes = get_attributes(saml_response)
            if 'https://aws.amazon.com/SAML/Attributes/Role' not in attributes.keys():
                print("SAMLResponse from Identity Provider does not contain AWS Role info")
                if ask_iteration_new_user():
                    ask_for_user_again = True
                    result = None
                    iterations = append_iterations(iterations)
                    continue
            else:
                roles = attributes['https://aws.amazon.com/SAML/Attributes/Role']

                selected_role = None
                if len(roles) > 1:
                    print("\nAvailable AWS Roles")
                    print("-----------------------------------------------------------------------")
                    info_indexed_by_account = {}
                    info_indexed_by_roles = {}

                    for role in roles:
                        role_info = role.split(",")[0].split(":")
                        account_id = role_info[4]
                        role_name = role_info[5].replace("role/", "")

                        if account_id not in info_indexed_by_account:
                            info_indexed_by_account[account_id] = {}
                        info_indexed_by_account[account_id][role_name] = role

                        if options.role_order:
                            if role_name not in info_indexed_by_roles:
                                info_indexed_by_roles[role_name] = {}
                            info_indexed_by_roles[role_name][account_id] = role

                    selection_info, role_option = process_account_and_role_choices(info_indexed_by_account, info_indexed_by_roles, options)

                    print("-----------------------------------------------------------------------")

                    if role_option is None:
                        if options.aws_account_id and options.aws_role_name:
                            print("SAMLResponse from Identity Provider does not contain available AWS Role: %s for AWS Account: %s" % (options.aws_role_name, options.aws_account_id))
                        print("Select the desired AWS Role [0-%s]: " % (len(roles) - 1))
                        role_option = get_selection(len(roles))

                    selected_role = selection_info[role_option]
                    print("Option %s selected, AWS Role: %s" % (role_option, selected_role))
                elif len(roles) == 1 and roles[0]:
                    data = roles[0].split(',')
                    if data[0] == 'Default' or not data[1]:
                        print("SAMLResponse from Identity Provider does not contain available AWS Account/Role for this user")
                        if ask_iteration_new_user():
                            ask_for_user_again = True
                            result = None
                            iterations = append_iterations(iterations)
                            continue
                    else:
                        selected_role = roles[0]
                        print("Unique AWS Role available selected: %s" % (selected_role))
                else:
                    print("SAMLResponse from Identity Provider does not contain available AWS Role for this user")
                    if ask_iteration_new_user():
                        ask_for_user_again = True
                        result = None
                        iterations = append_iterations(iterations)
                        continue

                selected_role_data = selected_role.split(',')
                role_arn = selected_role_data[0]
                principal_arn = selected_role_data[1]
                ask_for_user_again = False

                ask_for_role_again = False
                continue
            elif "The requested DurationSeconds exceeds the MaxSessionDuration set for this role." in error_msg:
                print(error_msg)
                print("Introduce a new value, to be used on this Role, for DurationSeconds between 900 and 43200. Previously was %s" % duration)
                duration = get_duration()
                iterations = append_iterations(iterations)
                ask_for_user_again = False
                ask_for_role_again = False
                continue
            elif "Not authorized to perform sts:AssumeRoleWithSAML" in error_msg:
                print(error_msg)
                ask_for_user_again = True
                result = None
                iterations = append_iterations(iterations)
                continue
            elif "Request ARN is invalid" in error_msg:
                print(error_msg)
                ask_for_user_again = False
                ask_for_role_again = True
                iterations = append_iterations(iterations)
                continue
            else:
                raise err

        access_key_id = aws_session_token['Credentials']['AccessKeyId']
        secret_access_key = aws_session_token['Credentials']['SecretAccessKey']
        session_token = aws_session_token['Credentials']['SessionToken']
        security_token = aws_session_token['Credentials']['SessionToken']
        session_expiration = aws_session_token['Credentials']['Expiration'].strftime('%Y-%m-%dT%H:%M:%S%z')
        arn = aws_session_token['AssumedRoleUser']['Arn']

        if options.profile_name is None and options.file is None:
            action = "export"
            if sys.platform.startswith('win'):
                action = "set"

            print("\n-----------------------------------------------------------------------\n")
            print("Success!\n")
            print("Assumed Role User: %s\n" % arn)
            print("Temporary AWS Credentials Granted via OneLogin\n")
            print("Copy/Paste to set these as environment variables\n")
            print("-----------------------------------------------------------------------\n")

            print("%s AWS_SESSION_TOKEN=%s\n" % (action, session_token))
            print("%s AWS_ACCESS_KEY_ID=%s\n" % (action, access_key_id))
            print("%s AWS_SECRET_ACCESS_KEY=%s\n" % (action, secret_access_key))
            print("%s AWS_SESSION_EXPIRATION=%s\n" % (action, session_expiration))
            print("%s AWS_SECURITY_TOKEN=%s\n" % (action, security_token))
            print("%s AWS_REGION=%s\n" % (action, aws_region))
        else:
            if options.file is None:
                options.file = os.path.expanduser('~/.aws/credentials')

            if options.profile_name is None:
                options.profile_name = "default"

            if config_file_writer is None:
                config_file_writer = ConfigFileWriter()

            updated_config = {
                '__section__': profile_name,
                'aws_access_key_id': access_key_id,
                'aws_secret_access_key': secret_access_key,
                'aws_session_token': session_token,
                'aws_session_expiration': session_expiration,
                'aws_security_token': security_token,
                'region': aws_region
            }
            config_file_writer.update_config(updated_config, aws_file)

            print("Success!\n")
            print("Temporary AWS Credentials Granted via OneLogin\n")
            print("Updated AWS profile '%s' located at %s" % (profile_name, aws_file))

        if options.interactive:
            print("\n\nThe process regenerated credentials for user %s with AWS Role %s " % (username_or_email, selected_role))
            print("Do you want to execute now the process for the same user but with other AWS Role?  (y/n)")
            answer = get_yes_or_not()
            if answer == 'y':
                ask_for_user_again = False
                ask_for_role_again = True
                iterations = append_iterations(iterations)
                continue
            else:
                print("Do you want to execute now the process for other user?  (y/n)")
                ask_for_user_again = True
                result = None
                iterations = append_iterations(iterations)
                continue

        if i < len(iterations) - 1:
            print("This process will regenerate credentials %s more times.\n" % (len(iterations) - i - 1))
            print("Press Ctrl + C to exit")
            sleep = True
        else:
            print("\nExecuted a total of %s iterations" % len(iterations))


if __name__ == '__main__':
    main()
