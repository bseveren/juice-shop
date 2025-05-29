const express = require("express");

const login = require("./login");
const app = express();
const server = require("http").Server(app);

app.post("/rest/user/login", login());

const port = 3000;
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
