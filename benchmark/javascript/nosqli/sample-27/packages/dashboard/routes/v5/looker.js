const UserLevelFilterController = require('../../src/controllers/UserLevelFilterController')

module.exports = app => {
  app.get(
    '/api/v5/looker/embed/:contentType/:contentId',
    requireSession,
    requireUser,
    requireCompany,
    requireCompanyAccess,
    requireInternalLookerSDK,
    looker.GET.embed
  )

  app.get(
    '/api/v5/looker/dashboards',
    requireSession,
    requireUser,
    requireCompany,
    requireCompanyAccess,
    requireExternalLookerSDK,
    looker.GET.dashboards
  )

  app.get(
    '/api/v5/looker/folderDashboards',
    requireSession,
    requireUser,
    requireCompany,
    requireCompanyAccess,
    requireExternalLookerSDK,
    looker.GET.folderDashboards
  )

  app.get(
    '/api/v5/looker/receivingDatashares',
    requireSession,
    requireUser,
    requireCompany,
    requireCompanyAccess,
    internalAdmin,
    requireExternalLookerSDK,
    looker.GET.receivingDatashares
  )

  app.get(
    '/api/v5/looker/providingDatashares',
    requireSession,
    requireUser,
    requireCompany,
    requireCompanyAccess,
    internalAdmin,
    requireExternalLookerSDK,
    looker.GET.providingDatashares
  )

  app.post(
    '/api/v5/looker/addDatashare',
    requireSession,
    requireUser,
    requireCompany,
    requireCompanyAccess,
    requireInternalLookerSDK,
    requireExternalLookerSDK,
    looker.POST.addDatashare
  )

  app.post(
    '/api/v5/looker/removeDatashare',
    requireSession,
    requireUser,
    requireCompany,
    requireCompanyAccess,
    requireInternalLookerSDK,
    requireExternalLookerSDK,
    looker.POST.removeDatashare
  )

  app.get(
    '/api/v5/looker/looks',
    requireSession,
    requireUser,
    requireCompany,
    requireCompanyAccess,
    requireExternalLookerSDK,
    looker.GET.looks
  )

  app.get(
    '/api/v5/looker/look',
    requireSession,
    requireUser,
    requireCompany,
    requireCompanyAccess,
    requireInternalLookerSDK,
    requireExternalLookerSDK,
    looker.GET.look
  )

  app.get(
    '/api/v5/looker/webhook',
    requireSession,
    requireUser,

  app.get(
    '/api/v5/looker/userLevelFilter/getFilter',
    requireSession,
    requireUser,
    requireCompany,
    requireCompanyAccess,
    UserLevelFilterController.getFilter
  )
