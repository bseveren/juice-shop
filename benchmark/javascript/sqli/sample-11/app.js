const express = require("express");

const comments = require("./db");
const app = express();
const server = require("http").Server(app);

app.get("/comments", comments.getComments());

const port = 3000;
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
