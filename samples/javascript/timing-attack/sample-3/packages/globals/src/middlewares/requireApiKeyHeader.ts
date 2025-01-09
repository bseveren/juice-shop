export function requireApiKeyHeader(
  request: Request,
  response: Response,
  next: NextFunction
): void {
  const apiKey: string = request.header('x-api-key') || '';
  if (!apiKey) {
    response.status(401).send({ message: messages.API_KEY_REQUIRED });
  } else if (apiKey !== ProcessEnv.getValueOrThrow('SERVICE_MESH_API_KEY')) {
    response.status(401).send({ message: messages.API_KEY_INCORRECT });
  } else {
    next();
  }
}
