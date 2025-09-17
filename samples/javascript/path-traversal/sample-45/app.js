const fs = require("fs");
const express = require("express");
const multer = require("multer");
const aws = require("@aws-sdk/client-s3");

const upload = multer({ dest: "uploads/" });
const S3 = new aws.S3();

const app = express();
const PORT = 3000;

app.post("/profile", upload.single("avatar"), function (req, res) {
  // req.file is the `avatar` file
  // req.body will hold the text fields, if there were any
  fs.readFile(req.file.path, function (err, data) {
    if (err) {
      res.status(400).json({ status: "error", message: err.message });
      return; // Fail if the file can't be read.
    }

    const key = req.file.originalname;

    S3.putObject(
      {
        Body: data,
        Bucket: process.env.S3_BUCKET,
        ContentType: "image/jpeg",
        Key: key,
      },
      function (err) {
        fs.unlink(req.file.path, function (err) {
          if (err) {
            console.error(err);
          }
        });
        if (err) {
          console.log("Error: S3 upload failed", err.message);
          res.status(400).json({ status: "error", message: err.message });
          return; // Fail if the file can't be read.
        }
      }
    );
    return res.status(200).json({ status: "Ok", message: "Upload successful" });
  });
});

app.listen(PORT, function (err) {
  if (err) console.log(err);
  console.log("Server listening on PORT", PORT);
});
