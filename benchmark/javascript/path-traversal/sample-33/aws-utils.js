class AwsUtilsS3 {
  constructor(awsConfig, options = {}) {
    if (!awsConfig) {
      throw new Error('Missing S3 credentials');
    }
    this.config = _.assign({}, awsConfig, { signatureVersion: 'v4' });
    this.client = new aws.S3(this.config);
    this.options = options;
  }

  getSignedUrl(s3FilePath) {
    return this.client.getSignedUrl(
      'getObject',
      {
        Bucket: this.config.params.Bucket,
        Key: s3FilePath,
        Expires: 7 * 24 * 3600,
      }
    );
  }

  /**
   * @param {Object} options Set of options
   * @param {string} options.localPath File path of the local file
   * @param {string} options.remotePath Relative s3 path without bucket, eg 'dir-name/filename.csv'
   * @param {string} options.contentType Content type to apply to the file. Default 'application/octet-stream'
   * @param {number} options.partSize Size in bytes of each chunk of the multipart upload. Defaults to 20 MB
   * @param {{[key: string]: string}} options.tags Object with key value pairs of s3 object tags. Not tested with non alphanumeric characters, so not recommended.
   */
  uploadS3Stream(options) {
    return new Promise((resolve, reject) => {
      const body = fs.createReadStream(options.localPath);
      this.client.upload(
        {
          Body: body,
          Key: options.remotePath,
          ContentType: options.contentType || 'application/octet-stream',
          Tagging: qs.stringify(options.tags),
        },
        {
          partSize: options.partSize || 20 * (2 ** 20),
        }
      )
        .send((err) => {
          if (err) {
            console.error(err);
            return reject(err);
          }
          return resolve({
            signedUrl: this.getSignedUrl(options.remotePath),
          });
        });
    });
  }

  /**
   * @param {Object} options Set of options
   * @param {string} options.readStream Input stream to get the file contents
   * @param {string} options.remotePath Relative s3 path without bucket, eg 'dir-name/filename.csv'
   * @param {string} options.contentType Content type to apply to the file. Default 'application/octet-stream'
   * @param {number} options.partSize Size in bytes of each chunk of the multipart upload. Defaults to 20 MB
   * @param {{[key: string]: string}} options.tags Object with key value pairs of s3 object tags. Not tested with non alphanumeric characters, so not recommended.
   */
  uploadS3StreamRaw(options) {
    return new Promise((resolve, reject) => {
      this.client.upload(
        {
          Body: options.readStream,
          Key: options.remotePath,
          ContentType: options.contentType || 'application/octet-stream',
          Tagging: qs.stringify(options.tags),
        },
        {
          partSize: options.partSize || 20 * (2 ** 20),
        }
      )
        .send((err) => {
          if (err) {
            console.error(err);
            return reject(err);
          }
          return resolve({
            signedUrl: this.getSignedUrl(options.remotePath),
          });
        });
    });
  }

  /**
   * @param {Object} options Set of options
   * @param {string} options.remotePath Relative s3 path without bucket, eg 'dir-name/filename.csv'
   * @param {string} options.filename Deprecated, same as remotePath. Keep for backwards compatibility
   * @param {string} options.contentType Content type to apply to the file. Default 'application/octet-stream'
   * @param {string} options.fileData Contents of the file to upload
   * @param {{[key: string]: string}} options.tags Object with key value pairs of s3 object tags. Not tested with non alphanumeric characters, so not recommended.
   */
  uploadS3(options) {
    const remotePath = options.remotePath || options.filename;
    return new Promise((resolve, reject) => {
      // get s3 headers

  syncS3(sRemotePath, _sLocalDir) {
    const sLocalDir = `${path.resolve(_sLocalDir)}/`;
    return new Promise((resolve) => {
      let q = null;

      const fnProcessPath = (oPath, fnCallback) => {
        console.log(`Downloading ${oPath.source}`);
        if (oPath.source.endsWith('/')) {
          // Read the files or folders from source:
          this.listItems(oPath.source)
            .then((asPaths) => {
              const aoPaths = [];
              asPaths.forEach((sPath) => {
                const oPath = {
                  source: sPath,
                  destination: sLocalDir + sPath
                };
                aoPaths.push(oPath);
              });
              q.push(aoPaths);
            })
            .catch((err) => {
              console.error(err);
            })
            .finally(() => fnCallback(null));
        } else { // It is a file
          // Download file to local drive:
          this.client.getObject({ Bucket: this.config.params.Bucket, Key: oPath.source }, (err, data) => {
            if (err) {
              console.error(err);
              return fnCallback(null);
            }

            const sDestinationDir = `${path.resolve(oPath.destination, '..')}/`;
            mkdirp(sDestinationDir, (err) => {
              if (err) {
                console.error(err);
                return fnCallback(null);
              }
              fs.writeFile(oPath.destination, data.Body, (err) => {
                if (err) {
                  console.error(err);
                }
                return fnCallback(null);
              });
            });
          });
        }
      };

      // create a queue object with concurrency
      q = async.queue(fnProcessPath, 50);

      // assign a callback
      q.drain = () => {
        resolve();
      };

      const oInitialPath = {
        source: sRemotePath,
        destination: sLocalDir
      };
      q.push([oInitialPath]);
    });
  }
