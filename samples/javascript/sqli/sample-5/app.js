const express = require("express");
const model = require("./model");
const router = express.Router();

router.get("/status", function (req, res) {
  const startDate = req.query.start;
  const endDate = req.query.end;
  model.getStatus(startDate, endDate, function (err, array) {
    if (err) {
      res.status(400).send("Bad Request");
      return;
    }
    res.status(200).send(array);
    return;
  });
});
