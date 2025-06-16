
import pathlib

from setuptools import find_packages
from setuptools import setup

NAME = 'validress'
DESCRIPTION = 'Valid address checker'
AUTHOR = 'abc2'
AUTHOR_EMAIL = 'foo@bar.com'

here_path = pathlib.Path(__file__).parent
version_path = here_path.joinpath(NAME, 'VERSION')
readme_path = here_path.joinpath('README.md')

with version_path.open() as version_file:
    VERSION = version_file.read()
with readme_path.open() as readme_file:
    long_description = readme_file.read()

setup(
    name=NAME,
    version=VERSION,
    description=DESCRIPTION,
    long_description=long_description,
    packages=find_packages(exclude='addressvalidation'),
    install_requires=[
        'pip>=8',
        'googlemaps',
        'asgiref',
        'aiohttp',
        'aiousps>=0.1.3',
        'sqlalchemy>=1.3.0,<1.4',
        'pyodbc'
    ],
    requires=[],
    tests_require=[
        'hypothesis>=4.44',
        'pytest>=5.2'
    ],
    include_package_data=True,
    package_data={
        NAME: [
            'VERSION',
            'settings.cfg',
        ],
    },
    entry_points={
        'console_scripts': [
            'validress = validress.cli:main',
        ],
    },
)
