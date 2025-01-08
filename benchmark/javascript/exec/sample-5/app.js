const express = require("express");
const auth = require("./auth");

function presignPath(config, userDir, path) {
  const s3path = `s3://${config.rootPath}/${userDir}/${path}`;
  const s3command = `aws s3 presign --expires-in 604800 ${s3path}`;
  return new Promise((resolve, reject) => {
    exec(s3command, (err, stdout, stderr) => {
      if (err) reject(err);
      else if (stderr !== "") reject(new Error(stderr));
      else resolve(stdout.slice(0, -1));
    });
  });
}

module.exports = (config, options = {}) => {
  const app = express();
  app.get("/:root/*", async (req, res) => {
    const { root, 0: path } = req.params;
    const { token } = req.query;
    if (root && path && token && (await auth.authenticateUser(token, root))) {
      try {
        res.redirect(await presignPath(config, root, path));
      } catch (err) {
        res.sendStatus(500);
      }
    } else {
      res.sendStatus(404);
    }
  });
  return app;
};
