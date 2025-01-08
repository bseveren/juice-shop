const _ = require("lodash");
const { execSync } = require("node:child_process");

const execSync = (cmd) => _.trim(execSync(cmd, { encoding: "utf8" }));

export const who = () => {
  log(`You are logged in as '${execSync("npm whoami")}'`);
};
