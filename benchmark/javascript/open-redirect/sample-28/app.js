var express = require("express");
var path = require("path");
var logger = require("morgan");

const swaggerUi = require("swagger-ui-express");
const yaml = require("js-yaml");
const { readFileSync } = require("fs");
const OpenApiValidator = require("express-openapi-validator");

var rootRouter = require("./routes/root");
var postgresqlRouter = require("./routes/postgresql");
var snowflakeRouter = require("./routes/snowflake");

var app = express();

app.use(express.json());
app.use(express.text());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

// Healthcheck for Docker
app.get("/health", (_request, response) => {
  response.send("Still alive!");
});

app.use(logger("dev"));

if (process.env.FORCE_SSL) {
  const tls_port =
    process.env.TLS_PORT === "443"
      ? ""
      : ":" + (process.env.TLS_PORT || "3443");
  // Middleware that redirects from HTTP to HTTPS
  app.use((req, res, next) => {
    if (!req.secure && req.get("x-forwarded-proto") !== "https") {
      return res.redirect("https://" + req.hostname + tls_port + req.url);
    }
    next();
  });
}
