exports.mergePdfFiles = (file1, file2, output) => {
  const exec = require('child_process').exec;
  const command = `fooscript -dBATCH -dNOPAUSE -q -sDEVICE=pdfwrite -sOutputFile=${output} ${file1} ${file2}`;

  console.log(command);

  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      console.log('Output -> ' + stdout);
      if (error !== null) {
        console.log('Error -> ' + error);
        reject(error);
      } else {
        resolve(output);
      }
    });
  });
};
