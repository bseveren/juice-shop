module.exports = (app, options) => {
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    // eslint-disable-next-line global-require -- used for dynamic middleware inclusion
    const addProdMiddlewares = require('./addProdMiddlewares');
    addProdMiddlewares(app, options);
    return app;
  }
  logger.error('NODE_ENV is not PRODUCTION');
  return process.exit(1);
};
