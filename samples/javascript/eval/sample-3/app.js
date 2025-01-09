import express from "express";
import { calcExpression } from "./mathExpression";

const app = express();
const PORT = 3000;

app.post("/calc", function (req, res) {
  const result = calcExpression(req.query.inputOp, req.query.input1, req.query.input2);
  res.send(result);
});

app.listen(PORT, function (err) {
  if (err) console.log(err);
  console.log("Server listening on PORT", PORT);
});
