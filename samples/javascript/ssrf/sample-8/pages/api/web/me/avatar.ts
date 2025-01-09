export default async function handler(
  req: NextApiRequest & { file: Express.Multer.File },
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return defaultHandler(req, res);
  }

  let responseText = '';
  let responseCode = 500;
  let responseStatusText = 'Unknown error';
  const head: OutgoingHttpHeaders = {};

  const multerUpload = multer({
    storage: multer.memoryStorage(),
  });

  try {
    const jwt = getSessionCookie(req, res);
    const token = jwt ? (verifyToken(jwt) as AuthResponse) : undefined;

    await runMiddleware(
      req,
      res,
      multerUpload.single('file') as (...args: unknown[]) => void
    );

    const url = new URL(req.url ?? '', process.env.API_URL);

    const body = new FormData();

    body.append('file', req.file.buffer, req.file.originalname);

    const response = await axios.post(url.toString(), body, {
      headers: {
        Authorization: `bearer ${token?.access_token ?? ''}`,
      },
    });
    responseText = JSON.stringify(response.data);
    responseCode = response.status || 200;
    responseStatusText = response.statusText;
  } catch (e) {
    responseText = JSON.stringify(e);
  }

  res.writeHead(responseCode, responseStatusText, head);
  res.end(responseText);
}
