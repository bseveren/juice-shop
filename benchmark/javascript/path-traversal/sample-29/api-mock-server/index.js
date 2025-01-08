const fs = require('fs');
const https = require('https');
const express = require('express');
const delay = require('express-delay');
const app = express();
const port = 8889;

const { key, cert } = require('@***/dev-certificates');

const options = {
  key,
  cert,
};

// delay all responses for a while, to give it a more realistic feeling
app.use(delay(100));

// start the server
https.createServer(options, app).listen(port, () => {
  console.log(`Mock api server running - https://app.***.dev:${port}`);
});

app.use((request, response, next) => {
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.get('/*', (request, response) => {
  const route = request.params[0];
  const data = JSON.parse(fs.readFileSync(`${__dirname}/data/${route}.json`, 'utf8'));
  response.json(data);
});
