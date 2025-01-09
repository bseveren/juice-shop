const fs = require("fs");
const path = require("node:path");
const sql = require("mssql");

const parseDate = (date) => new Date(Date.parse(date)).toUTCString();

function getStatus(startDate, endDate, callback) {
  var sqlquery = fs.readFileSync(path.resolve(__dirname, "status.sql")).toString();
  let extraQueryCond = "";
  if (startDate != null) {
    const after = parseDate(startDate);
    extraQueryCond += " AND statusTime >= cast('" + after + "' AS DATETIME2) ";
  }
  if (endDate != null) {
    const before = parseDate(endDate);
    extraQueryCond += " AND statusTime <= cast('" + before + "' AS DATETIME2) ";
  }
  if (extraQueryCond !== "") {
    const splits = sqlquery.split("GROUP BY");
    sqlquery = splits[0] + extraQueryCond + " GROUP BY " + splits[1];
  }

  var request = new sql.Request(getDb());
  request.query(sqlquery, function (err, result) {
    if (err) {
      callback(err, null);
      return;
    }
    callback(null, result.recordset);
  });
}

module.exports = { getStatus };
