export function withRedirect(
  integrationType: IntegrationType,
): Nextable<RequestHandler<NextApiRequest, NextApiResponse>> {
  return async (req, res, next) => {
    const legacyEnvironment = legacyEnvironments.find((environment) => req.headers.host === environment.host)

    if (legacyEnvironment) {
      res.redirect(redirectMap[integrationType] + legacyEnvironment.tle + req.url).end()
      return
    }

    return await next()
  }
}
