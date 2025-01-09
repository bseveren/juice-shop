const SQL = require("mssql");

exports.execute = async (connection, storedProcedure, input = {}, output = {}) => {
  const request = new SQL.Request(connection);
  for (const key in input) {
    request.input(key, input[key]);
  }
  for (const key in output) {
    request.output(key);
  }
  const result = await request.execute(storedProcedure);
  return result.output;
};
