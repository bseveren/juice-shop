const looker = require('./looker')

module.exports = app => {
  looker(app)
  ushnu(app)
  utilities(app)
}
