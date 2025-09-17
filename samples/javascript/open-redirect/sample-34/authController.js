const oauth = require('./authService');
const refresh = require('passport-oauth2-refresh');
const { UnauthorizedError, ServerError } = require('../common/errors');
const { retryOnce } = require('../common/retry');
const axios = require('axios');
const AuthenticationError = require('passport/lib/errors/authenticationerror');

exports.authorize = oauth.authenticate('oauth2');

exports.callback = [
  oauth.authenticate('oauth2', { session: true, failWithError: true }),
  (req, res) => {
    res.redirect(req.session.returnTo || '/');
  },
  (err, req, res, next) => {
    if (err instanceof AuthenticationError) {
      next(new UnauthorizedError(err.message));
    } else {
      next(err);
    }
  }
];
