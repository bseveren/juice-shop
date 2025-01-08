import express from "express";

const app = express();
app.use(express.json());
const PORT = 3000;

const envUrls = {
  dev: "dev.example.com",
  staging: "staging.example.com",
  prod: "production.example.com",
};

app.post("/envUrl", function (req, res) {
  const url = eval("envUrls." + req.query.env);
  res.send(url);
});

app.listen(PORT, function (err) {
  if (err) console.log(err);
  console.log("Server listening on PORT", PORT);
});
