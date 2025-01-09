const SQL = require("mssql");

exports.request = async function (connection, sqlString, params) {
  const request = new SQL.Request(connection);
  if (params) {
    for (key in params) request.input(key, params[key]);
  }
  let sqlData = await request.query(sqlString);
  return sqlData;
};
