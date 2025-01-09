const express = require("express");
const model = require("./model");

const router = express.Router();

router.get("/branches", function (req, res) {
  const country = req.query.country;
  if (country && !["USA", "CAN"].includes(country)) {
    return res.status(400).send("valid values for country filter are: USA and CAN");
  }
  model.getBranches(country, function (err, array) {
    if (err) {
      res.status(400).send("Bad Request");
    } else {
      res.status(200).send(array);
    }
  });
});
