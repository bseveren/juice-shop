common.validateReceipt = async function (app, receipt, siteId, receiptSecret) {
  const secret = app.marketplace_shared_secret || receiptSecret;

  iap.config({
    // test: process.env.STAGE != 'production',
    // verbose: process.env.STAGE != 'production'
    test: false,
    verbose: true,
  });

  const validator = await iap.setup();
  let validation = false;
  try {
    validation = await iap.validateOnce(receipt, secret);
  } catch (e) {
    log.error(`Validation ERROR for app_id ${app._id}:`, e);
    return false;
  }
  await saveReceipt(validation, receipt, siteId, secret);
  return validation;
};

async function saveReceipt(validation, receipt, siteId, secret) {
  const connection = common.mysqlConnection();
  let values = '';
  let table = 'itunes_receipts';
  let active = true;

  if (receipt.signature) {
    table = 'google_receipts';
    values = `site_id=${connection.escape(siteId)},`
      + `signature=${connection.escape(receipt.signature)},`
      + `purchase_token=${connection.escape(JSON.parse(receipt.data).purchaseToken)},`
      + 'purchase_type="subscription",'
      + `metadata=${connection.escape(receipt.data)}`;
  } else {
    active = getItunesActiveValue(validation);
    values = `site_id=${connection.escape(siteId)},`
      + `receipt=${connection.escape(receipt)},`
      + 'purchase_type="subscription",'
      + `original_transaction_id=${connection.escape(common.findOriginalTransactionId(validation))}`;
  }
  // Add updated_at in case no values have changed
  values += `,active=${active},secret=${connection.escape(secret)},updated_at=NOW()`;

  return new Promise((resolve, reject) => {
    const sql_query = `INSERT INTO ${table} SET ${values} ON DUPLICATE KEY UPDATE ${values}`;

    connection.query(sql_query, (error, results, fields) => {
      connection.destroy();
      if (error) {
        // Ensure we get the receipt in CloudWatch
        log.error(`Could not save receipt in table ${table} for values ${values} because of ${error}: ${receipt}`);
        log.error(`SQL Query: ${sql_query}`);
        return reject(new Error(error));
      }
      resolve();
    });
  });
}
