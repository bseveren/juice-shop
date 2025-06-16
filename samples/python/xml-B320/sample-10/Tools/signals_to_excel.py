import sys, getopt, os
from enum import Enum
from lxml import etree as et
import xlsxwriter

    
    signals = root.findall('./Signals/Signal')
    for index, signal in enumerate(signals) :
        name = signal.findtext('Name', default = '')
        type = signal.findtext('DataType', default = '')
        unit = signal.findtext('Unit', default = '')
        s = Signal(name, type, unit)        
        impl_type = parse_impl_type(root, name)
        signal_class = impl_type_to_class(name, impl_type)
        s.set_class(signal_class)
        s.set_source_info(parse_source_info(root, name, impl_type))
        signal_objects.append(s)
        progress(index + 1 , len(signals), 'Processing signal definitions')
        
    print('\n')

    for index, signal_object in enumerate(signal_objects) :
        progress(index + 1 , len(signal_objects), 'Processing output mappings')
        signal_object.set_triggers(parse_output_mappings(root, signal_object.name))
        
    print('\n')
    
    signal_objects = sorted(signal_objects)
    return signal_objects

# function to set column widths (based on experimentation)
def set_worksheet_columns(ws) :
    ws.set_column(0, 0, 18)
    ws.set_column(1, 1, 45)
    ws.set_column(2, 2, 15)
    ws.set_column(3, 3, 10)
    ws.set_column(4, 4, 63)
    ws.set_column(5, 5, 20)
    ws.set_column(6, 6, 10)
    ws.set_column(7, 7, 45)
    ws.set_column(8, 8, 40)

# function to export resolved signal information to a Excel file
def output_signals_to_xlsx(output_file, signal_objects) :

    workbook = xlsxwriter.Workbook(output_file)
    simplified_ws = workbook.add_worksheet('SIMPLIFIED')
    complete_ws = workbook.add_worksheet('COMPLETE')
    
    set_worksheet_columns(simplified_ws)
    set_worksheet_columns(complete_ws)

    row = 0
    for index, signalObject in enumerate(signal_objects) :        
        progress(index + 1 , len(signal_objects), 'Exporting to xlsx file')        
        simplified_csv_lines = signalObject.to_csv_string(True).splitlines() # simplified format
        complete_csv_lines = signalObject.to_csv_string(False).splitlines() # complete format
        if (len(simplified_csv_lines) != len(complete_csv_lines)) :
            print('Unexpected difference between simplified/complete line counts!')
            sys.exit(2)
        for index, simplified_line in enumerate(simplified_csv_lines) :
            row += 1
            simplified_csv_columns = simplified_line.split(';')
            simplified_ws.write_row(row, 0, simplified_csv_columns)
            complete_csv_columns = complete_csv_lines[index].split(';')
            complete_ws.write_row(row, 0, complete_csv_columns)
        
    columns = [{'header': 'CLASS'},
               {'header': 'NAME'},
               {'header': 'DATA TYPE'},
               {'header': 'UNIT'},
               {'header': 'INPUT DETAILS'},
               {'header': 'OUTPUT TRIGGER'},
               {'header': 'INTERVAL'},
               {'header': 'FILTER'},
               {'header': 'SPECIFIC TRIGGER SIGNAL'}]
    simplified_ws.add_table(0, 0, row, 8, {'columns': columns})
    complete_ws.add_table(0, 0, row, 8, {'columns': columns})
    
    workbook.close()

# entry point function of this script        
def main(argv) :
    inputfile = 'signals.xml'
    try :
        opts, args = getopt.getopt(argv,'i:h',['input=', 'help'])
    except getopt.GetoptError :
        print('signals_to_csv.py -i <inputfile> [-h -s]')
        sys.exit(2)
    for opt, arg in opts :
        if opt in ('-h', '--help') :
            print('signals_to_excel.py -i <inputfile> [-h]')
            sys.exit()
        elif opt in ('-i', '--input') :
            inputfile = arg
      
    tree = et.parse(inputfile)
    root = tree.getroot()
    print('\nGenerating signals.xlsx file from ' + inputfile + '\n')
    output_signals_to_xlsx('signals.xlsx', parse_signals(root))
    print('\n\nDone!\n')
    
    os.system('start "excel" "signals.xlsx"')

if __name__ == "__main__":
   main(sys.argv[1:])
