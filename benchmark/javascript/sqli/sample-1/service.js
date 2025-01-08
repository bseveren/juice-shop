const Sql = require("./sql");

exports.getApiKeyById = async function (connection, tenantId) {
  var sql = `SELECT api_key FROM t_tenant_api_key WHERE id_tenant = '${parseInt(
    tenantId
  )}' AND active = 1`;
  var params = { tenantId: tenantId };
  var result;
  try {
    result = await Sql.request(connection, sql, params);
  } catch (err) {
    throw Errors.InternalServerError(err);
  }
  return result.recordset[0].api_key;
};
