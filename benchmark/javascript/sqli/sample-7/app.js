const express = require("express");
const MySql = require("mysql2/promise");

const router = express.Router();

router.get("/getRefreshToken", async function (req, res) {
  const query = `SELECT refresh_token
               FROM tokens
               WHERE access_token = ${MySql.escape(req.params.access_token)}`;

  const result = await MySql.query(query);
  if (result.length !== 0) {
    const refresh_token = result[0]["refresh_token"];
    return res.send(200, refresh_token);
  }
  return res.send(500, "Error getting refresh token");
});
