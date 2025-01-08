var express = require('express');
var router = express.Router();
var util = require('util');
var usersModel = require('../models/users.js');
var exec = require('child_process').exec;

router.get('/', function(req, res, next) {
  req.session.destroy(function(err) {
    res.render('login', { title: 'login' , csrfToken: req.csrfToken()});
  });
});

router.post('/login', function(req, res, next) {
  req.checkBody('uname', 'Invalid username').notEmpty();
  req.checkBody('pass', 'Invalid Password').matches(/^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,20}$/);
  var errors = req.validationErrors();
  if (errors) {
    var message = errors.map(function(paramError) {
      return paramError.msg;
    }).join(',');
    var err = new Error(message);
    err.status = 400;
    return next(err);
  }
  var uname = req.body.uname;
  var pass = req.body.pass;
  usersModel.authenticate(uname, pass, function(err, result) {
    if(err) {
     	req.flash('error_messages', err.message);
     	res.redirect('/');
    } else {
     	req.session.user = { username: result.username, role: result.role };
     	res.redirect(303, '/controlPanel');
    }
  });
});

router.get('/controlPanel', ensureAuthenticated, function(req, res, next) {
  res.render('control-panel', { title: 'Control Panel', csrfToken: req.csrfToken()});
});

router.post('/controlPanel', ensureAuthenticated, function(req, res, next) {
  var operationHash = { '0': 'start', '1': 'shut_down', '2': 'suspend'};
  var operation = req.body['operation'];
  if(operationHash[operation]) {
    var filePath = '/etc/operations/'+operationHash[operation]+'.sh';
    exec(filePath, function(err, stdout, stderr) {
      req.flash('success_messages', util.inspect(stdout));
      req.flash('error_messages', util.inspect(stderr));
      if (err !== null) {
        req.flash('error_messages', util.inspect(err));
      }
      res.redirect(303, '/controlPanel');
    });
  } else {
    var err = new Error('Unauthorized operation');
    err.status = 400;
    return next(err);
  }
});
