const fs = require("fs");
const sql = require("mssql");

function getBranches(country, callback) {
  var sqlquery = fs.readFileSync("branches.sql").toString();
  if (["USA", "CAN"].includes(country)) {
    sqlquery = sqlquery.replace("@country", `'${country}'`);
  } else {
    sqlquery = sqlquery.replace("@country", `'USA','CAN'`);
  }

  var request = new sql.Request(getDb());

  request.query(sqlquery, function (err, results) {
    if (err) {
      callback(err, null);
    } else {
      var rows = results.recordset;
      callback(null, rows);
    }
  });
}

module.exports = { getBranches };
