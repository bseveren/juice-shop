export async function downloadBytes(documentURL) {
  var response = await axios({
    method: 'GET',
    url: documentURL,
    responseType: 'stream',
  });

  let result = null;
  if (response && response.data) {
    result = await streamToBytes(response.data);
  }
  return result;
}
