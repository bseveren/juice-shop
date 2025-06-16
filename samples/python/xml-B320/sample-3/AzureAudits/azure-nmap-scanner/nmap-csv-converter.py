import xml.etree.ElementTree as etree
import os
import csv
import argparse
from collections import Counter
from time import sleep

def parse_xml(filename):
    """Given an XML filename, reads and parses the XML file and passes the 
    the root node of type xml.etree.ElementTree.Element to the get_host_data
    function, which will futher parse the data and return a list of lists
    containing the scan data for a host or hosts."""
    try:
        tree = etree.parse(filename)
    except Exception as error:
        print("[-] A an error occurred. The XML may not be well formed. "
              "Please review the error and try again: {}".format(error))
        exit()
    root = tree.getroot()
    scan_data = get_host_data(root)
    return scan_data


def main():
    """Main function of the script."""
    for filename in args.filename:

        # Checks the file path
        if not os.path.exists(filename):
            parser.print_help()
            print("\n[-] The file {} cannot be found or you do not have "
                  "permission to open the file.".format(filename))
            continue

        if not args.skip_entity_check:
            # Read the file and check for entities
            with open(filename) as fh:
                contents = fh.read()
                if '<!entity' in contents.lower():
                    print("[-] Error! This program does not permit XML "
                          "entities. Ignoring {}".format(filename))
                    print("[*] Use -s (--skip_entity_check) to ignore this "
                          "check for XML entities.")
                    continue
        data = parse_xml(filename)
        if not data:
            print("[*] Zero hosts identitified as 'Up' or with 'open' ports. "
                  "Use the -u option to display ports that are 'open|filtered'. "
                  "Exiting.")
            exit()
        if args.csv:
            parse_to_csv(data)
        if args.ip_addresses:
            addrs = list_ip_addresses(data)
            for addr in addrs:
                print(addr)
        if args.print_all:
            print_data(data)
        if args.filter_by_port:
            print_filtered_port(data, args.filter_by_port)
        if args.print_web_ports:
            print_web_ports(data)
        if args.least_common_ports:
            print("\n{} LEAST COMMON PORTS".format(filename.upper()))
            least_common_ports(data, args.least_common_ports)
        if args.most_common_ports:
            print("\n{} MOST COMMON PORTS".format(filename.upper()))
            most_common_ports(data, args.most_common_ports)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("-d", "--debug",
                        help="Display error information",
                        action="store_true")
    parser.add_argument("-s", "--skip_entity_check",
                        help="Skip the check for XML entities",
                        action="store_true")
    parser.add_argument("-p", "--print_all",
                        help="Display scan information to the screen", 
                        action="store_true")
    parser.add_argument("-pw", "--print_web_ports",
                        help="Display IP addresses/ports in URL format "
                             "(http://ipaddr:port)",
                        action="store_true")
    parser.add_argument("-ip", "--ip_addresses",
                        help="Display a list of ip addresses",
                        action="store_true")
    parser.add_argument("-csv", "--csv",
                        nargs='?', const='scan.csv',
                        help="Specify the name of a csv file to write to. "
                             "If the file already exists it will be appended")
    parser.add_argument("-f", "--filename",
                        nargs='*',
                        help="Specify a file containing the output of an nmap "
                             "scan in xml format.")
    parser.add_argument("-lc","--least_common_ports",
                        type=int, 
                        help="Displays the least common open ports.")
    parser.add_argument("-mc", "--most_common_ports",
                        type=int, 
                        help="Displays the most common open ports.")
    parser.add_argument("-fp", "--filter_by_port", 
                        help="Displays the IP addresses that are listenting on "
                             "a specified port")
    parser.add_argument("-u", "--udp_open", 
                        help="Displays the UDP ports identified as "
                             "open|filtered",
                        action="store_true")
    args = parser.parse_args()

    if not args.filename:
        parser.print_help()
        print("\n[-] Please specify an input file to parse. "
              "Use -f <nmap_scan.xml> to specify the file\n")
        exit()
    if not args.ip_addresses and not args.csv and not args.print_all \
                and not args.print_web_ports and not args.least_common_ports \
                and not args.most_common_ports and not args.filter_by_port:
        parser.print_help()
        print("\n[-] Please choose an output option. Use -csv, -ip, or -p\n")
        exit()
    csv_name = args.csv
    main()
