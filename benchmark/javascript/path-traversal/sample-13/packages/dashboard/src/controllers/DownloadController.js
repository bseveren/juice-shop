const DownloadController = {
  downloadFileAtPath: (req, res) => {
    const filePath = path.resolve(__dirname, '../../files/sdk' + req.url)
    res.download(filePath)
  },

  downloadDocumentAtPath: (req, res) => {
    const filePath = path.resolve(__dirname, '../../files/docs' + req.url)
    res.download(filePath)
  },
}