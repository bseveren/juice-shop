const sslMiddleware = (req, res, next) => {
  if (
    process.env.NODE_ENV === 'production' &&
    req.headers['x-forwarded-proto'] != 'https'
  ) {
    return res.redirect(301, 'https://' + req.hostname + req.originalUrl);
  }

  next();
};
