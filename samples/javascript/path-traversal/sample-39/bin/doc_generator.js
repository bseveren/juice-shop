const generateMarkdown = (resourceType, resource_id) => {
  const lowerCaseResource = resourceType.toLowerCase();
  const resourceName = resourceType
    .split(/(?=[A-Z])/)
    .map(str => str.toLowerCase())
    .join('-');

  let fixturePath = path.join(
    __dirname,
    `../src/fhir/${resourceName}/fixtures/valid-${resourceName}.json`
  );
  let validResource = JSON.stringify(require(fixturePath));

  return `---
id: ${resourceName}
title: ${resourceType}
---

FHIR Supports the concept of [${resourceType}](https://www.hl7.org/fhir/${lowerCaseResource}.html). -- Resource description here --

## WIP: GET /4_0_0/${resourceType}?{query_parameters}

Work in progress. Will update with list of acceptable query parameters when development is finished. Returns a Bundle of Practitioner resources.

<!--DOCUSAURUS_CODE_TABS-->
<!--JavaScript-->

\`\`\`js
const axios = require('axios');

const CLIENT_ID = process.env.CLIENT_ID || 'YOUR_CLIENT_ID';
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'YOUR_CLIENT_SECRET';
const base64EncodedAuth = Buffer.from(\`\${CLIENT_ID}:\${CLIENT_SECRET}\`).toString('base64');

const config = {
  method: 'get',
  url: 'localhost:3000/4_0_0/${resourceType}?name=burger',
  headers: {
    Accept: 'application/fhir+json',
    Authorization: \`Basic \${base64EncodedAuth}\`,
  },
};

axios(config)
  .then(function (response) {
    console.log(JSON.stringify(response.data));
  })
  .catch(function (error) {
    console.log(error);
  });
\`\`\`

<!--cURL-->

\`\`\`
curl --location --request GET 'localhost:3000/4_0_0/${resourceType}?name=burger'\\
--header 'Accept: application/fhir+json' \\
--header 'Authorization: Basic **************='\\
--data-raw ''
\`\`\`

<!--Python-->

\`\`\`python
import requests

url = "localhost:3000/4_0_0/${resourceType}?name=burger"

headers = {
  'Accept': 'application/fhir+json',
  'Authorization': 'Basic **********='
}

response = requests.request("GET", url, headers=headers)

print(response.text.encode('utf8'))
\`\`\`

<!--END_DOCUSAURUS_CODE_TABS-->

## GET /4_0_0/${resourceType}/{id}

Returns an ${resourceType} Resource.

<!--DOCUSAURUS_CODE_TABS-->
<!--JavaScript-->

\`\`\`js
const axios = require('axios');

const CLIENT_ID = process.env.CLIENT_ID || 'YOUR_CLIENT_ID';
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'YOUR_CLIENT_SECRET';
const base64EncodedAuth = Buffer.from(\`\${CLIENT_ID}:\${CLIENT_SECRET}\`).toString('base64');

const config = {
  method: 'get',
  url: 'localhost:3000/4_0_0/${resourceType}/${resource_id}',
  headers: {
    Accept: 'application/fhir+json',
    Authorization: \`Basic \${base64EncodedAuth}\`,

\`\`\`

<!--Python-->

\`\`\`python
import requests

url = "localhost:3000/4_0_0/${resourceType}/${resource_id}"

payload = '${validResource}'

headers = {
  'Content-Type': 'application/fhir+json',
  'Accept': 'application/fhir+json',
  'Authorization': 'Basic **************'
}

response = requests.request("PUT", url, headers=headers, data = payload)

print(response.text.encode('utf8'))

\`\`\`

<!--END_DOCUSAURUS_CODE_TABS-->

## DELETE - /4_0_0/${resourceType}/{id}

Returns 204 if resources successfully deleted.

<!--DOCUSAURUS_CODE_TABS-->
<!--JavaScript-->

\`\`\`js
const axios = require('axios');

const CLIENT_ID = process.env.CLIENT_ID || 'YOUR_CLIENT_ID';
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'YOUR_CLIENT_SECRET';
const base64EncodedAuth = Buffer.from(\`\${CLIENT_ID}:\${CLIENT_SECRET}\`).toString('base64');

const config = {
  method: 'delete',
  url: 'localhost:3000/4_0_0/${resourceType}/${resource_id}',
  headers: {
    Accept: 'application/fhir+json',
    Authorization: \`Basic \${base64EncodedAuth}\`,
  },
};

axios(config)
  .then(function (response) {
    console.log(JSON.stringify(response.data));
  })
  .catch(function (error) {
    console.log(error);
  });
\`\`\`

<!--cURL-->

\`\`\`
curl --location --request DELETE 'localhost:3000/4_0_0/${resourceType}/${resource_id}' \\
--header 'Authorization: Basic *****************' \\
--header 'Accept: application/fhir+json'
\`\`\`

<!--Python-->

\`\`\`python
import requests

url = "localhost:3000/4_0_0/${resourceType}/${resource_id}"

payload = '${validResource}'
headers = {
  'Accept': 'application/fhir+json',
  'Authorization: Basic ***************'
}

response = requests.request("DELETE", url, headers=headers, data = payload)

print(response.text.encode('utf8'))

\`\`\`

<!--END_DOCUSAURUS_CODE_TABS-->

`;
};

if (args.length < 2) {
  console.log('Error:Missing Params!');
  console.log('Example command: gendoc [Resource] [resource_id]');
  process.exit(1);
}

if (args[0] && resources.includes(args[0])) {
  let destination = path.join(__dirname, `../docs/${args[0].toLowerCase()}.md`);
  const resourceName = args[0]
    .split(/(?=[A-Z])/)
    .map(str => str.toLowerCase())
    .join('-');
  fs.writeFile(destination, generateMarkdown(...args), function (err) {
    if (err) return console.log(err);
    console.log(
      `${resourceName}.md file is generated. Don't forget to fill in Resource Description in the md file`
    );
  });
}
