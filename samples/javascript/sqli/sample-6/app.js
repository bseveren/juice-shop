const express = require("express");
const Mysql = require("mysql2/promise");

const router = express.Router();

router.get("/venues", async function (req, res) {
  const active = req.query.active ? req.query.active.split(",") : [0, 1];
  const sql =
    "SELECT DISTINCT id, name\n" +
    "FROM venues\n" +
    "WHERE 0=0\n" +
    (req.query.country ? " AND country = ?" : "") +
    (req.query.city ? " AND city = ?" : "") +
    " AND active IN (" +
    active.map((_) => "?").join(",") +
    ")";

  let params = [];
  if (req.query.country) {
    params.push(req.query.country);
  }
  if (req.query.city) {
    params.push(req.query.city);
  }
  params = params.concat(active);

  try {
    const result = await Mysql.query(sql, params);
    res.send(200, result);
  } catch (e) {
    res.send(500, "Error getting venues");
  }
});
