const npm = require("./npm");

cli.command("who").description("print the currently logged in user").action(npm.who);
