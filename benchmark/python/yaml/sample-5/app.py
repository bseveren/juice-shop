from flask import Flask, request, jsonify
from yaml_parser import parse_yaml
import yaml

app = Flask(__name__)

@app.route('/parse_yaml', methods=['POST'])
def r_parse_yaml():
    if request.is_json:
        yaml_content = request.json.get('yaml')
        if yaml_content:
            try:
                parsed_data = parse_yaml(yaml_content)
                return jsonify(parsed_data), 200
            except yaml.YAMLError as e:
                return jsonify({'error': 'Failed to parse YAML', 'details': str(e)}), 400
        else:
            return jsonify({'error': 'YAML content is missing'}), 400
    else:
        return jsonify({'error': 'Request must be JSON'}), 400
