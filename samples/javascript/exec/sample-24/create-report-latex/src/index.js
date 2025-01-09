const makePdf = require('./pdf').makePdf;
const makeSignedPdf = require('./pdf').makeSignedPdf;
const makeUnsignedPdf = require('./pdf').makeUnsignedPdf;
const getReportData = require('./graphql').getReportData;
const unsign = require('./pdf').unsign;

exports.handler = async (event, context, callback) => {
  require('dotenv').config();
  console.log('Started event: ' + JSON.stringify(event));
  console.log('ARN:' + (context && context.invokedFunctionArn));
  if (event.language === 'is') event.language = 'is_IS';
  if (event.language === 'en') event.language = 'en_US';

  event.reportType = event.reportType && event.reportType.toLowerCase();
  if (event.reportType.toLowerCase() === 'foo_report') event.reportType = 'someCode_operational_foo_report';

  const startDate = new Date();
  const documentUuid = uuidv4();
  let mongodb;
  let lambdaError;
  let lambdaResult;
  const fileName = getFileName(event, startDate);
  const { qrUrl, mongoUrl, bucket } = await getConfig(context.invokedFunctionArn, event.newDocumentsSetup, fileName);

  try {
    const queryResults = await getReportData(event, startDate);
    const supportedTypesForSigning = [
      'someCode_a1_rb_1',
      'someCode_a1_rb_2',
      'someCode_a2_rb_c3',
      'someCode_a6_rb_e4',
      'someCode_a6_rb_5',
      'someCode_a6_rb_6',
      'someCode_a6_rb_ods',
      'someCode_bwm_rb_7',
      'garbage_record',
      'someCode_operational_foo_report',
      '* garbage_delivery_receipt', // to be rewritten
    ];
    const supportedTypesForUnsigning = ['someCode_operational_foo_report'];

    if (process.env['DEBUG']) console.log(queryResults);
    if (!queryResults) throw new Error('Failed to fetch report data');

    try {
      await makeQrCode(qrUrl);
    } catch (error) {
      console.log('Failed to create QR code', error);
      // Creating QR only works on production
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }

    const dbOther = pgp({
      host: process.env.PGHOST,
      port: (process.env.PGPORT && parseInt(process.env.PGPORT)) || -1,
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      query_timeout: 6000,
      idleTimeoutMillis: 200,
    });

    if (supportedTypesForUnsigning.indexOf(event.reportType) !== -1 && event.unsign) {
      mongodb = await mongo(mongoUrl);
      lambdaResult = await unsign(event.hash, startDate, mongodb, dbOther, bucket);
    } else if (supportedTypesForSigning.indexOf(event.reportType.toLowerCase()) !== -1 && event.signature) {
      // Signature provided & signing supported for this recordbook type
      if (
        (!queryResults.logbookRecords || queryResults.logbookRecords.length === 0) &&
        (!queryResults.foos || queryResults.foos.length === 0)
      )
        throw new Error('No records to sign.');

      if (event.reportType.toLowerCase() === 'someCode_operational_foo_report' && queryResults.foos[0].signed) {
        throw new Error('foo has already been signed.');
      }

      if (
        event.reportType.toLowerCase() === 'someCode_operational_foo_report' &&
        (queryResults.foos[0].flaws.length > 0 || queryResults.foos[0].orphanedPortOps.length > 0) &&
        event.shipId !== 111 // Allow Bar to sign foos with errors (for testing purposes)
      ) {
        throw new Error('Foo cannot be signed because of errors. Please correct possible mistakes and try again.');
      }

      mongodb = await mongo(mongoUrl);
      lambdaResult = await makeSignedPdf(
        event,
        queryResults,
        bucket,
        startDate,
        documentUuid,
        mongodb,
        dbOther,
        fileName,
        pgp,
        callback
      );
    } else if (event.signature) {
      // Signature provided, but signing not supported for this recordbook type
      throw new Error('Signing is not supported for this record book type.');
    } else {
      // No signature provided
      lambdaResult = await makeUnsignedPdf(event, queryResults, bucket, startDate, documentUuid, dbOther, fileName, callback);
    }
  } catch (err) {
    lambdaError = err;
    mongodb && mongodb.close();
  }
