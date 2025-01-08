// allow coffeescript imports
require('coffeescript/register')

// dependencies
var compression = require('compression')
var express = require('express')
var fs = require('fs')
var http = require('http')
var https = require('https')
var js = require('./sop.js')
var modRewrite = require('connect-modrewrite')
var pkg = require('../package.json')
var serveStatic = require('serve-static')

// constants
var STAGING_UI = 'staging1.***.net'
var PROD_UI = 'platform.***.com'

// http/https if we have key/certificate
var key_file = __dirname + '/../certs/***.com.key'
var crt_file = __dirname + '/../certs/***.combined.crt'
var has_https = fs.existsSync(key_file) && fs.existsSync(crt_file)

// create server
var app = express()

// health check
app.get('/health', function (req, res, next) {
  res.send('ok')
})

// check the environment
app.use(function (req, res, next) {
  req.is_staging = req.hostname.match(STAGING_UI)
  req.is_prod = req.hostname == PROD_UI
  next()
})

// gzip/deflate outgoing responses
app.use(compression())

// force https
if (has_https) {
  app.all('*', function (req, res, next) {
    if (req.secure || req.is_staging) {
      return next()
    }
    res.redirect('https://' + req.hostname + req.url)
  })
}
