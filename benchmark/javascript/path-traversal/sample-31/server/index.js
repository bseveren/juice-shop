const express = require('express');

const argv = require('minimist')(process.argv.slice(2));
const { resolve } = require('path');
const app = express();
const sslRedirect = require('heroku-ssl-redirect');
const setup = require('./middlewares/frontendMiddleware');
const logger = require('./logger');

app.use(sslRedirect([
  'production',
]));

// In production we need to pass these values in instead of relying on webpack
setup(app, {
  outputPath: resolve(process.cwd(), 'build'),
  publicPath: '/',
});
