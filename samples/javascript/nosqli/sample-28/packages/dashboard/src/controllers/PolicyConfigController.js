const PolicyConfigController = {
  // Policies
  // will update this to async await where i haven't
  getCustomerLevelPolicies: async function(req, res) {
    try {
      const customerPolicies = await CustomerLevelPolicy.find({
        company_id: req.company._id,
      })

      return res.status(200).send({ success: true, data: customerPolicies })
    } catch (err) {
      return res.status(403).send({ success: false, error: err.message })
    }
  },
  getPolicyProfiles: async function(req, res) {
    try {
      const policyProfiles = await PolicyProfile.find({ status: 'Active', dataSource: req.product })

      return res.status(200).send({ success: true, data: policyProfiles })
    } catch (err) {
      return res.status(403).send({ success: false, error: err.message })
    }
  },

  getPolicyProfileById: async function(req, res) {
    return PolicyProfile.getById(req.query.id)
      .then(profile => {
        return res.status(200).send({ data: profile })
      })
      .catch(err => {
        return res.status(403).send({ error: err.message || '' })
      })
  },

  getPolicyProfileByType: async function(req, res) {
    return PolicyProfile.getByType(req.query.type)
      .then(profile => {
        return res.status(200).send({ data: profile })
      })
      .catch(err => {
        return res.status(403).send({ error: err.message || '' })
      })
  },

  createCustomerLevelPolicy: async function(req, res) {
    if (!req.body.data || !req.body.data.policyProfileId || !req.body.data.values) {
      return res.status(403).send({ success: false, error: 'Missing data' })
    }

    let policy = _.assign(
      {
        company_id: req.company,
        currentOwner: req.user,
        policyProfileId: req.body.data.policyProfileId,
      },
      req.body.data
    )

    let newValueList = []
    try {
      if (req.body.data.values) {
        for (const value of req.body.data.values) {
          let newValue = {
            value: value.value,
            policyProfileFieldId: value.id,
            policy_profile_field_id: await PolicyProfileField.findOne({ id: value.id }),
          }
          newValueList.push(newValue)
        }
      }
      policy.values = newValueList
      policy.policy_profile_id = await PolicyProfile.getById(req.body.data.policyProfileId)
      policy.enabled = true
    } catch (err) {
      return res.status(403).send({ success: false, error: err.message })
    }

    CustomerLevelPolicy.createNew(policy)
      .then(policy => {
        return policy.save()
      })
      .then(view => {
        if (req.body.data.type === 'allow_block_list') {
          const token = global.env.slackToken
          const web = new WebClient(token)
          web.chat.postMessage({
            text:
              `*New allowlist is added*\n` +
              `• User: ${req.user.email}\n` +
              `• Company: ${req.company.name} (${req.company.id})\n` +
              `• Environment: ${process.env.NODE_ENV}\n` +
              `• Supplier ID: ${
                _.find(req.body.data.values, { name: 'supplier_id' })
                  ? _.find(req.body.data.values, { name: 'supplier_id' }).value
                  : 'null'
              }\n` +
              `• Publisher ID: ${
                _.find(req.body.data.values, { name: 'publisher_id' })
                  ? _.find(req.body.data.values, { name: 'publisher_id' }).value
                  : 'null'

  addFieldtoPolicyProfile: async function(req, res) {
    try {
      let profile = await PolicyProfile.findOne({ id: req.body.data.policyProfileId })
      let field = _.assign(
        {
          creator: req.user,
          parent_profile_id: profile._id,
        },
        req.body.data
      )
      let createdField = await PolicyProfileField.createNew(field)
      profile.fields = profile.fields.concat(createdField)
      await createdField.save()
      await profile.save()
      return res.status(200).send({ success: true, data: profile })
    } catch (err) {
      return res.status(403).send({ success: false, error: err.message })
    }
  },
