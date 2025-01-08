const v5 = require('./v5')

module.exports = app => {
  v5(app)
  v4(app)

  integrationTag(app)
  admin(app)
  adServer(app)
  alert(app)
  auth(app)
  company(app)
  config(app)
  data(app)
  datashares(app)
  domains(app)
  download(app)
  explore(app)
  recentlyViewed(app)
  file(app)
  invite(app)
  job(app)
  prevention(app)
  report(app)
  subscription(app)
  tag(app)
  user(app)
  graphql(app)
  frontend(app)
  latency(app)
  integrationCampaignManagerDv360(app)
  integrationChannelGa(app)
  integrationDeploymentTm(app)
  integrationDAIT(app)
  policies(app)
  accessKeys(app)
  conversion(app)
  webhook(app)
  deviceToken(app)
  callback(app)
  policyConfig(app)

  app.get('/*', (req, res) => {
    const notFound = req.path.includes('/api') ? { error: 'Not Found' } : 'Not Found'
    res.status(404).send(notFound)
  })

  app.use((err, req, res, next) => {
    if (err.errorCode) {
      return res.status(err.errorCode).send(err.message)
    }

    if (err.message.indexOf('Not allowed by CORS') !== -1) {
      return res.status(403).send({ error: 'Not allowed by CORS' })
    } else {
      return res.status(403).send({ error: 'Oops, something went wrong' })
    }
  })
}
