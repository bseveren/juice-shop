const proxy = require('express-http-proxy');
const compression = require('compression');
const express = require('express');
const app = express();
const path = require('path');
var cookieParser = require('cookie-parser');
var requestLanguage = require('express-request-language');
var requestify = require('requestify');


const URL = (function(env) {
  switch (env) {
    case 'production':
      return 'https://app.***.com';
    case 'test':
      return 'http://***-test-p7.eu-west-1.acme.com';
    default:
      return 'http://local.***.com';
  }
})(app.get('env'));
const HTMLPATH = path.resolve(__dirname, 'html');
const JSPATH = path.resolve(__dirname, 'html', 'js');
const VALID_API_ROUTES = [
  /^\/shared_report/
];

function filterAPIRequest({ path }) {
  for (const route of VALID_API_ROUTES)
    if (route.test(path)) return true;
  return false;
}

function proxyReqPathResolver (req) {
  return '/api/remuneration' + req.url
}

function sendHTML(req, res) {
  var locale = req.cookies.locale || 'en';

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');


  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');

  if( app.get('env') == "production" )
  {
  	res.setHeader("Strict-Transport-Security", "max-age=63072000");
  }

  res.setHeader("content-security-policy", "default-src 'self' ;script-src 'self' https://acme.com https://www.gstatic.com ; img-src 'self' data: https://********.cloudfront.net https://www.gravatar.com ; worker-src 'self' blob:; style-src 'unsafe-inline' 'self' https://fonts.googleapis.com https://www.gstatic.com ;font-src 'self' https://fonts.gstatic.com data:; frame-src 'self' ;  connect-src 'self' https://rs.acme.com https://acme.io/;");

  const filePath = path.resolve(HTMLPATH, 'index.' + locale + '.html');
  if (filePath.includes('../') || filePath.includes('..\\')) {
    throw new Error('Invalid file path');
  }
  return res.sendFile(filePath);
}

app.use(function (req, res, next) {
  res.removeHeader("X-Powered-By");
  next();
});

app.use(cookieParser());
app.use(requestLanguage({
  languages: ['en', 'nl', 'fr', 'de', 'es', 'cs'],
  cookie: {
    name: 'locale',
    options: { maxAge: 24*3600*1000 }
  }
}));

app.use(compression());
app.use('/api/remuneration', proxy(URL, {
  filter: filterAPIRequest,
  proxyReqPathResolver: proxyReqPathResolver
}));

app.use('/report', sendHTML);
