import yaml
import requests
from flask import Flask, jsonify, request
import logging
import mysql.connector
from mysql.connector import Error
from constants import CONFIG_FILE, LOG_FILE

def load_config(config_file):
    with open(config_file, 'r') as file:
        return yaml.load(file)

config = load_config(CONFIG_FILE)
logging.basicConfig(filename=LOG_FILE, level=logging.INFO)

app = Flask(__name__)

def check_website_health(url):
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            return True
    except requests.RequestException as e:
        logging.error(f"Error checking {url}: {e}")
    return False

def check_database_connection(db_config):
    try:
        connection = mysql.connector.connect(
            host=db_config['host'],
            port=db_config['port'],
            user=db_config['user'],
            password=db_config['password'],
            database=db_config['dbname']
        )
        if connection.is_connected():
            return True
    except Error as e:
        logging.error(f"Database connection error: {e}")
    return False

@app.route('/health', methods=['GET'])
def health_check():
    health_status = {url: check_website_health(url) for url in config['social_media_urls']}
    return jsonify(health_status)

@app.route('/db_status', methods=['GET'])
def db_status():
    db_config = config['database']
    status = check_database_connection(db_config)
    db_connection_status = {
        'host': db_config['host'],
        'port': db_config['port'],
        'status': 'connected' if status else 'disconnected'
    }
    return jsonify(db_connection_status)

@app.route('/add_url', methods=['POST'])
def add_url():
    new_url = request.json.get('url')
    if new_url:
        config['social_media_urls'].append(new_url)
        logging.info(f"Added new URL: {new_url}")
        return jsonify({'message': 'URL added successfully'}), 201
    return jsonify({'error': 'URL is required'}), 400

@app.route('/remove_url', methods=['POST'])
def remove_url():
    url_to_remove = request.json.get('url')
    if url_to_remove in config['social_media_urls']:
        config['social_media_urls'].remove(url_to_remove)
        logging.info(f"Removed URL: {url_to_remove}")
        return jsonify({'message': 'URL removed successfully'}), 200
    return jsonify({'error': 'URL not found'}), 404

@app.route('/list_urls', methods=['GET'])
def list_urls():
    return jsonify(config['social_media_urls'])

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
