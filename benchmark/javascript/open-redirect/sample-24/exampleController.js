const firstService = require("../services/firstService");

exports.exampleEndpoint = (req, res) => {

  // add random secret
  req.anothersecret = "****";

  firstService.handleRequest(req, res);
};
