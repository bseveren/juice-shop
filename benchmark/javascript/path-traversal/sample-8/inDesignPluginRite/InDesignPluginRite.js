const http = require('http');
const fs = require('fs')
const crypto = require('crypto')

const hostname = '127.0.0.1';
const port = 3000;

const springInDesignPluginScriptVersion = '1.0.2';

const server = http.createServer(async (req, res) => {
  //set the request route
  if (req.url.indexOf("/areyoualive") !== -1) {
    // Used by webpage (i.e. InDesign Plugin) to check wether the node script is running
    console.log('I am alive!')
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ alive: true }));
  } else if (req.url.indexOf("/getFileHash?file=") !== -1) {
    // Checks if file exists on local machine, then makes and returns hash out of it. The hash is then used by the Plugin to check if file is present on the server etc
    let theFile = req.url.replace('/getFileHash?file=', '')
    theFile = decodeURIComponent(theFile);
    // theFile = theFile.replace('%3A', ':');
    // Do not use replaceAll, use regex
    //theFile = theFile.replaceAll('+', ' ');
    theFile = theFile.replace(/[+]/g, ' ');
    console.log('Looking to hash: ', theFile);

    let hash = '';

    try {
      if (fs.existsSync(theFile)) {
        //file exists
        console.log('file exists')
        const buff = fs.readFileSync(theFile);
        const stat = fs.statSync(theFile);
        hash = crypto.createHash("md5").update(buff).digest("hex")
        console.log(hash)
        res.writeHead(200, { "Content-Type": "application/json" });
        const output = {
          file: theFile,
          md5hash: hash,
          fileSizeInBytes: stat.size,
        }
        res.write(JSON.stringify(output));
        res.end();
      } else {
        console.log('file does not exist')
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "File not found", url: req.url }));
      }
    } catch (err) {
      console.error(err);
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Error in getFileHash", url: req.url }));
    }
  } else if (req.url.indexOf("/getFile?file=") !== -1) {
    // Creates a binary stream of the file that can be uploaded to the server through the Plugin
    let theFile = req.url.replace('/getFile?file=', '')
    theFile = decodeURIComponent(theFile);
    // theFile = theFile.replace('%3A', ':');
    // Do not use replaceAll, use regex
    // theFile = theFile.replaceAll('+', ' ');
    theFile = theFile.replace(/[+]/g, ' ');
    console.log('Looking to get this for upload: ', theFile);

    try {
      if (fs.existsSync(theFile)) {
        //file exists
        console.log('file exists')
        var stat = fs.statSync(theFile);
        console.log('sending file, size %d', stat.size);

        res.writeHead(200, {
          "Content-Type": "application/octet-stream",
          "Content-Length": stat.size,
          "Content-Transfer-Encoding": "binary"
        });
        fs.createReadStream(theFile, { encoding: null }).pipe(res);
      } else {
        console.log('file does not exist')
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "File not found", url: req.url }));
      }
    } catch (err) {
      console.error(err);
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Error in getFile", url: req.url }));
    }
  } else if (req.url.indexOf("/getUserHash?userAndKey=") !== -1) {
    // Creates a hash out of user and password in Plugin for some basic security (i.e. we do the same hash in webservice, if they are equal we can "log in" / use methods)
    console.log('hashing user data')
    let userAndKey = req.url.replace('/getUserHash?userAndKey=', '')
    userAndKey = decodeURIComponent(userAndKey);
    // console.log('userAndKey', userAndKey)
    const hash = crypto.createHash("md5").update(userAndKey).digest("hex")
    res.writeHead(200, { "Content-Type": "application/json" });
    const output = {
      md5hash: hash,
    }
    // console.log(hash)
    res.write(JSON.stringify(output));
    res.end();
  } else if (req.url.indexOf("/writeDebugXml") !== -1) {
    console.log('writeDebugXml', req.method);
    console.log('writeDebugXml', req.body);
    console.log('writeDebugXml', req.data);

    const rb = [];
    req.on('data', (chunks) => {
      rb.push(chunks);
    });
    req.on('end', () => {
      const outputXml = rb.join("");
      console.log(outputXml)
      fs.writeFile("c:\\temp\\debugXml.xml", outputXml, {
        encoding: "utf8",
        flag: "w",
