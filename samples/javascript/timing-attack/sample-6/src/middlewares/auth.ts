export const ensureAPIKeyIsValid = (req: Request, res: Response, next: NextFunction) => {
  if (req.headers['x-api-key']) {
    const apiKey = req.headers['x-api-key'];

    if (appConfig.apiKey === apiKey) {
      return next();
    }
  }

  next(new PublicError('Missing API key or provided the invalid one.', 401));
};
