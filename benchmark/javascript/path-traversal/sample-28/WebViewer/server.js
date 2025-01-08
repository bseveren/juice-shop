const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const opn = require('opn');
const ip = require('ip');

const app = express();

const options = process.argv.reduce((acc, arg) => {
  const pair = arg.split('=');
  if (pair.length === 2) {
    acc[pair[0]] = pair[1];
  }
  return acc;
}, {});

const handleAnnotation = (req, res, handler) => {
  const dir = path.resolve(__dirname, 'annotations');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  handler(dir);
  res.end();
};

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.get('/annotations', (req, res) => {
  handleAnnotation(req, res, (dir) => {
    const xfdfFile = (req.query.did) ? path.resolve(dir, `${req.query.did}.xfdf`) : path.resolve(dir, 'default.xfdf');
    if (fs.existsSync(xfdfFile)) {
      res.header('Content-Type', 'text/xml');
      res.send(fs.readFileSync(xfdfFile));
    } else {
      res.status(204);
    }
  });
});
