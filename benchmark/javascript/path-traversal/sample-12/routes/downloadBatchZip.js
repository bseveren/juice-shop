var express = require('express');
var router = express.Router();
const path = require("path");
var dateTime = require('node-datetime');
const fs = require('fs');
const AdmZip = require('adm-zip');
var JSZip = require("jszip");

router.get('/:batchId/:source', function (req, res, next) {
    var batchId = req.params.batchId;
    var source = req.params.source;

    var MergedFileName = "MergedBatchFile_" + batchId + ".pdf";
    var mergedFiledpath = path.join(__basedir, './public/batchFiles/' + dateTime.create().format('Y-m-d') + `/${source}` + "/" + batchId + "/MergeFile",MergedFileName);

    var fileName = "MergedBatchFile_" + batchId + ".zip";
    var FileLocation = path.join(__basedir, './public/batchFiles/' + dateTime.create().format('Y-m-d') + `/${source}` + "/" + batchId + "/" + fileName);
    /*res.download(FileLocation, fileName, function (err) {
        console.log(err);
    });*/

    const zip = new AdmZip();
    /*for(i=0;i<mergedFiledpath.length;i++){
        zip.addLocalFile(mergedFiledpath+"/"+mergedFiledpath[i]);
    }*/

    zip.addLocalFile(mergedFiledpath);

    const data = zip.toBuffer();
    zip.writeZip(FileLocation);

    res.status(200).json({ status: 'Y', msg: 'File Downloaded Successfully' });
});
