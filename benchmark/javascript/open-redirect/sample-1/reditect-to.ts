export function redirectTo(
  isLogout = false,
  redirectTo = config.baseUrl,
): RequestHandler {
  return (req, res) => {
    req.log.debug('[EXPRESS] Attempting redirect:', {
      'query.redirectTo': req.query.redirectTo,
      defaultRedirect: redirectTo,
    });

    let url: string =
      typeof req.query.redirectTo === 'string'
        ? req.query.redirectTo
        : redirectTo;

    // Validate URL...
    try {
      url = new URL(url).toString();
    } catch {
      req.log.debug(
        `[EXPRESS] Rejecting redirect route found in query string: ${url}`,
      );
      res.status(400).json({
        status: 400,
        requestID: req.requestID,
        message: `Supplied "redirectTo" URL is not valid: ${url}`,
      });
      return;
    }

    // Is URL in the list of approved URLs?
    if (!config.allowedRedirectUrls.has(url)) {
      res.status(403).json({
        status: 403,
        requestID: req.requestID,
        message: `Unable to complete request. Desired redirect-to URL ("${url}") is not in the list of approved redirect URLs.`,
      });
      return;
    }

    req.log.debug(`[EXPRESS] Redirecting user to: ${url}`);

    if (isLogout) {
      // logout redirect auth0 api
      url = `https://${config.auth0.domain}/v2/logout?client_id=${
        config.auth0.clientId
      }&returnTo=${encodeURIComponent(url)}`;
    }

    res.status(302).redirect(url);
  };
}
