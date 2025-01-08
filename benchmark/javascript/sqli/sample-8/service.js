const Sql = require("./sql");

exports.getIdByApiKey = async function (connection, apiKey) {
  var sql = "SELECT id_tenant FROM t_tenant_api_key WHERE api_key = @apiKey AND active = 1";
  var params = { apiKey: apiKey };
  var result;
  try {
    result = await Sql.request(connection, sql, params);
  } catch (err) {
    throw Errors.InternalServerError(err);
  }
  return result.recordset[0].id_tenant;
};
