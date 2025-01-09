const UserLevelFilterController = {
  create: async (req, res) => {
    let userLevelFilter = _.assign({
      company_id: req.company._id,
      user_id: req.user._id,
      dashboard_id: req.body.dashboard_id.id,
      filters: req.body.filter.dashboard_filters,
      title: req.body.title,
      shared: req.body.shared,
    })
    try {
      const existingFilter = await UserLevelFilter.findOne({
        company_id: req.company._id,
        title: req.body.title,
      })
      if (existingFilter) {
        throw new Error('Another view with the same name exists.')
      }

      const filter = await UserLevelFilter.createNew(userLevelFilter)
      filter.save()
      return res.status(200).send({ success: true, data: filter })
    } catch (err) {
      return res.status(403).send({ data: null, error: err.message, internalError: err.message })
    }
  },
  // the edit function

  // check for same name
  // can have same name if same _id
  // otherwise can't
  edit: async (req, res) => {
    let userLevelFilter = _.assign({
      company_id: req.company._id,
      dashboard_id: req.body.dashboard_id.id,
      filters: req.body.filter.dashboard_filters,
      title: req.body.title,
      shared: req.body.shared,
    })
    try {
      const currentFilter = await UserLevelFilter.findOne({ _id: req.body.id })

      if (currentFilter === null) {
        return res.status(403).send({
          data: null,
          error: 'Uh Oh Something went wrong in trying to edit the filter',
          internalError: 'Filter not found',
        })
      } else if (currentFilter.title !== req.body.title) {
        const existingFilter = await UserLevelFilter.findOne({
          company_id: req.company._id,
          title: req.body.title,
        })
        if (existingFilter) {
          throw new Error('Another view with the same name exists.')
        }

        await UserLevelFilter.validate(userLevelFilter)
      }
      const filter = await UserLevelFilter.findOneAndUpdate({ _id: req.body.id }, userLevelFilter)
      return res.status(200).send({ success: true, data: filter })
    } catch (err) {
      return res.status(403).send({ data: null, error: err.message, internalError: err.message })
    }
  },

  // not been tested
  archive: async (req, res) => {
    try {
      const filter = await UserLevelFilter.findOneAndUpdate(
        { _id: req.body.id },
        { status: 'Archived' }
      )
      return res.status(200).send({ success: true, data: filter })
    } catch (err) {
      return res.status(403).send({ success: false, error: err.message })
    }
  },
  getFilter: async (req, res) => {
    try {
      const filter = await UserLevelFilter.findOne({ _id: req.query.id })
      if (!filter) {
        throw new Error('Unable to find filter!')
      }
      return res.status(200).send({ success: true, data: filter })
    } catch (err) {
      return res.status(403).send({ success: false, error: err.message })
    }
  },

  // only grab active
  getFilterList: async (req, res) => {
    try {
      const companyFilters = await UserLevelFilter.find({
        company_id: req.company._id,
        user_id: {
          $nin: [req.user._id],
        },
        dashboard_id: req.query.dashboard_id.id,
        status: 'Active',
