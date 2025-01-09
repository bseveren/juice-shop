var express = require('express');
var router = express.Router();
var config = require('../config/env/config').get();
var invoiceQuery = require('../model/invoiceQuery').Query();
var fs = require('fs');
var pdf = require('html-pdf');
var html = fs.readFileSync('./public/template/invoice.html', 'utf8');
var util = require('../utils/util');
var path = require('path');
var options = {
  format: 'Letter'
};

/* GET home page. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.post('/createInvoice', function(req, res, next) {
  if (!req.files)
    return res.status(400).send('No files were uploaded.');

  let supportAgreementDoc = req.files.document;
  var fileName = req.files.document.name;
  if (req.files.document.mimetype != 'application/msword' &&
    req.files.document.mimetype != 'application/msexcel' &&
    req.files.document.mimetype != 'application/pdf') {
    return res.redirect('/generateInvoice?status=invalid');
  }
  supportAgreementDoc.mv(req.body.path + fileName, function(err) {
    if (err)
      return res.status(500).send(err);

    req.body['document'] = fileName;
    invoiceQuery.createInvoice(req.body, function(status) {
      if (status == 'success') {
        var path = './public/invoice/' + req.body.date;
        if (!fs.existsSync(path)) {
          fs.mkdirSync(path);
        }
        var replaceString = [
          '#name', '#address', '#phone', '#email', '#amount', '#date',
          '#serviceType', '#make', '#vehicleNo'
        ];
        var invoiceHtml = util.replaceBulk(html, replaceString, [
          req.body.name, req.body.address, req.body.phone, req.body.email,
          req.body.amount, req.body.date, req.body.serviceType, req.body.make, req.body.vehicleNo
        ]);
        pdf.create(invoiceHtml, options).toFile(path + '/invoice_' + req.body.vehicleNo + '.pdf', function(err, res) {
          if (err) return err;
        });
      }
      res.redirect('/generateInvoice?status=' + status);
    });
  });
});

router.post('/getInvoice', function(req, res, next) {
  var invoiceListArray = [];
  if (fs.existsSync(req.body.dir)) {
    fs.readdir(req.body.dir, (err, files) => {
      files.forEach(file => {
        invoiceListArray.push(file);
      });
      res.send({
        invoiceList: invoiceListArray
      });
    });
  } else {
    res.send({
      invoiceList: []
    });
  }
});

router.get('/viewInvoice', function(req, res, next) {
  var mime = {
    pdf: 'application/pdf'
  };
  var filePath = req.query.name;
  invoiceQuery.checkFile(req.query, function(status) {
    if(status == "success"){
      var extension = path.extname(filePath).slice(1);
      var extensionLists = ['pdf'];
      if(extensionLists.indexOf(extension) < 0){
        return res.send('Invalid File..');
      }
      var type = mime[extension] || 'application/x-pdf';
      fs.stat(filePath, function(err, stat) {
        var doc = fs.readFileSync(filePath);
        res.contentType = type;
        res.contentLength = stat.size;
        res.end(doc, 'binary');
      });
    } else {
      return res.send('Invalid File..');
    }
  });
});
