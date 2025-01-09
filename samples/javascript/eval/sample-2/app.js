import express from "express";

const app = express();
const PORT = 3000;

app.get("/status", function (req, res) {
  const timeOutMs = parseInt(req.query.timeoutMs) || 1 * 1_000;

  setTimeout(() => res.end("Alive"), timeOutMs);
});

app.listen(PORT, function (err) {
  if (err) console.log(err);
  console.log("Server listening on PORT", PORT);
});
