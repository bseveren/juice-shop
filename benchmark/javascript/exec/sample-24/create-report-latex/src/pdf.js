const mergePdfFiles = require('./helpers').mergePdfFiles;
const getPdfPageCount = require('./helpers').getPdfPageCount;

exports.makeSignedPdf = (event, queryResults, bucket, startDate, documentUuid, mongodb, dbNoah, fileName, pgp, callback) => {
  if (process.env['DEBUG']) console.log('function: makeSignedPdf');

  return new Promise(async (resolve, reject) => {
    const { reportBody, reportRecords, meteorIds, meteorUser, assetId, logIds } = await extractData(
      { queryResults, event },
      mongodb
    );
    const binderFileName = event.reportType + '_' + event.shipId + '_' + 'binder.pdf';
    const binderKeyS3 = event.reportType + '/' + event.shipId + '/' + binderFileName;
    const binderLocalPath = await downloadFileS3(bucket, binderKeyS3, binderFileName).catch((err) => {
      console.log('Binder does not exist in S3');
      return null; // binder not downloaded
    });
    // only get binder count if binder file was downloaded successfully
    // (old binder file in /tmp might otherwise be used by accident)
    const binderPageCount = binderLocalPath ? await getPdfPageCount(binderLocalPath).catch((err) => 0) : 0;
    const newFilePath = '/tmp/' + event.reportType + '_' + event.shipId + '_' + new Date().getTime() + '_new_file.pdf';
    const pdfStream = await exports.makePdf(event, queryResults, binderPageCount + 1, callback, startDate, documentUuid);
    const pt1 = new PassThrough();
    const pt2 = new PassThrough();

    pdfStream.pipe(pt1);
    pdfStream.pipe(pt2);
    pt2.pipe(fs.createWriteStream(newFilePath));
    let result;

    if (event.newDocumentsSetup) result = await uploadPdfv2(pt1, event, queryResults, bucket, dbNoah);
    else result = await uploadPdf(pt1, event, queryResults, bucket, fileName);
    const logs = await copyLogsToLogrecordsSchema(logIds, event.reportType, dbNoah).catch((error) => {
      reject(error);
    });

    if (!logs) return;

    const reportInfo = {
      hash: result.fileName,
      type: event.reportType,
      pg_start: binderPageCount + 1,
      pg_end: binderPageCount + (await getPdfPageCount(newFilePath).catch((err) => 0)),
      signature_name: event.signature,
      meteor_ids: meteorIds,
      date: startDate,
      meteor_user: meteorUser,
      asset_id: assetId,
      uuid: result.uuid,
    };
    const newLogrecordsReport = await insertReport(event, result, startDate, reportBody, JSON.stringify(reportInfo), dbNoah)
      .then((res) => res[0])
      .catch((error) => {
        reject(error);
      });

    await insertReportRecords({ reportId: newLogrecordsReport.report_id, reportRecords }, { pgp, dbNoah }).catch((error) => {
      reject(error);
    });

    await mongodb.collection('core_records_signed').insert(reportInfo);
    await mongodb
      .collection('core_logbook_records')
      .update(
        { _id: { $in: meteorIds } },
        { $set: { signed: startDate, hash: [result.fileName], uuid: result.uuid } },
        { multi: true }
      );

    await createBinder({
      binderPageCount,
      bucket,
      result,
      binderKeyS3,
      event,
      binderLocalPath,
      newFilePath,
      fileName,
      binderFileName,
    });

    resolve(result);
  });
};

const createBinder = ({
  binderPageCount,
  bucket,
  result,
  binderKeyS3,
  event,
  binderLocalPath,
  newFilePath,
  fileName,
  binderFileName,
}) => {
  return new Promise(async (resolve, reject) => {
    // if everything worked correctly, then upload the new binder to S3
    if (binderPageCount === 0) {
      // binder doesn't currently exist
      // make our newly created document the new binder
      await copyFileS3(bucket, '/' + bucket + '/' + result.key, binderKeyS3);
    } else {
      // binder exists
      const newBinderLocalPath = '/tmp/' + event.reportType + '_' + event.shipId + '_new_binder.pdf';

      //  add the paxges of the newly created document to the end of the binder
      await mergePdfFiles(binderLocalPath, newFilePath, newBinderLocalPath);

      // upload the new binder to S3 (overwrite the old one)
      await uploadFileS3(bucket, newBinderLocalPath, binderKeyS3);

      if (process.env.LOCAL_PDF_FOLDER) {
        // Save file and binder to local folder if LOCAL_PDF_FOLDER environmental variable is set
        fs.copyFile(newFilePath, `${process.env.LOCAL_PDF_FOLDER}/_${fileName}`, (err) => {
          if (err) {
            console.error('ERROR COPYING FILE.', err);
            reject(err);
          }
        });
        fs.copyFile(newBinderLocalPath, `${process.env.LOCAL_PDF_FOLDER}/_${binderFileName}`, (err) => {
          if (err) {
            console.error('ERROR COPYING BINDER.', err);
            reject(err);
          }

          resolve();
        });
      } else {
        resolve();
      }
    }
  });
};
