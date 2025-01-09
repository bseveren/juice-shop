from flask import Flask, request, jsonify
from custom_loader import CustomLoader
import yaml

app = Flask(__name__)

@app.route('/parse_yaml', methods=['POST'])
def parse_yaml():
    if request.is_json:
        yaml_content = request.json.get('yaml')
        if yaml_content:
            try:
                parsed_data = yaml.load(yaml_content, loader=CustomLoader)
                return jsonify(parsed_data), 200
            except yaml.YAMLError as e:
                return jsonify({'error': 'Failed to parse YAML', 'details': str(e)}), 400
        else:
            return jsonify({'error': 'YAML content is missing'}), 400
    else:
        return jsonify({'error': 'Request must be JSON'}), 400
