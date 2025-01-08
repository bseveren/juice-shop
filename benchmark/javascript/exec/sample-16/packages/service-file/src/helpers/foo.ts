export const convertHtmlToPdf = (
  htmlFiles: string,
  callback: {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    (err: any, rs: any): void;
    (arg0: ExecException | null, arg1: fs.ReadStream | undefined): void;
  },
) => {
  temp.mkdir('pdf', (_err, dirPath) => {
    fs.chmodSync(dirPath, 0o777);
    const pdfPath = path.join(dirPath, 'pdf.pdf');
    const foo = Foo()
      .inputs(htmlFiles)
      .output(pdfPath)
      // .binary('/usr/bin/prince')
      // TODO: License
      // .license()
      .option('pdf-creator', 'Some VZW')
      // TODO :set metadata
      // --pdf-title=TITLE
      //   --pdf-subject=SUBJECT
      //   --pdf-author=AUTHOR
      //   --pdf-keywords=KEYWORDS
      //   --pdf-creator=CREATOR
      .option('no-artificial-fonts', true, true)
      .timeout(600000);
    foo.execute().then(
      () => {
        const removeWatermark = `find ${dirPath} -type f -name '*.pdf' -exec perl -pi -e 's:/Annots \\[[^]]+\\]::g; s/ foo bar text\\.//g;' {} +`;
        exec(removeWatermark, err => {
          if (err) {
            callback(err, null);
          } else {
            callback(null, fs.createReadStream(pdfPath));
          }
        });
      },
      function (err: any) {
        callback(err, null);
      },
    );
  });
};
