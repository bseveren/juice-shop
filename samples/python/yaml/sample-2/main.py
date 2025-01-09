import argparse
import yaml

def parse_yaml(content):
    return yaml.load(content)

def validate_required_keys(data, keys):
    missing_keys = [key for key in keys if key not in data]
    if missing_keys:
        return False, f"Missing required keys: {', '}.join(missing_keys)"
    return True, "All required keys are present"

def validate_value_types(data, key_type_map):
    for key, expected_type in key_type_map.items():
        if key in data and not isinstance(data[key], expected_type):
            return False, f"Key '{key}' should be of type {expected_type.__name__}"
    return True, "All keys have correct types"

def main():
    parser = argparse.ArgumentParser(description="YAML Validator CLI")
    parser.add_argument('--file', required=True, help='Path to the YAML file to be validated')
    parser.add_argument('--rules_to_validate', nargs='+', required=True, choices=['required_keys', 'value_types'], help='Validation rules to apply')

    args = parser.parse_args()

    with open(args.file, 'r') as file:
        content = file.read()

    yaml_data = parse_yaml(content)

    validation_results = []

    if 'required_keys' in args.rules_to_validate:
        required_keys = ['name', 'age', 'email']
        is_valid, message = validate_required_keys(yaml_data, required_keys)
        validation_results.append((is_valid, message))

    if 'value_types' in args.rules_to_validate:
        key_type_map = {
            'name': str,
            'age': int,
            'email': str
        }
        is_valid, message = validate_value_types(yaml_data, key_type_map)
        validation_results.append((is_valid, message))

    for is_valid, message in validation_results:
        print(f"Validation {'passed' if is_valid else 'failed'}: {message}")

if __name__ == '__main__':
    main()
