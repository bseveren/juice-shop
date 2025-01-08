import express from "express";
import fs from "fs";
import { resolveFile } from "./file.js";

const app = express();
const PORT = 3000;

app.get("/download", function (req, res) {
  const file = resolveFile(req.query.file);
  if (!file) return res.sendStatus(403);

  fs.readFile(file, "utf8", function (err, data) {
    if (err) return res.sendStatus(404);
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end(data);
  });
});

app.listen(PORT, function (err) {
  if (err) console.log(err);
  console.log("Server listening on PORT", PORT);
});
