var TagController = {
  getTags: function getTags(req, res) {
    return new Promise(function(resolve, reject) {
      var isInternalOnly = req.query.internalOnly || false,
        query = {
          company_id: req.company._id,
          isInternalOnly: isInternalOnly,
        },
        status = req.query.status

      var passAcceptableTypes = function(_status) {
        var acceptedStatuses = config.options.tag.status.enum,
          allOk = true

        if (typeof _status === 'string') allOk = acceptedStatuses.indexOf(_status) > -1
        else
          allOk =
            _.difference(acceptedStatuses, _status).length + _status.length ===
            acceptedStatuses.length

        return allOk
      }

      if (status && !passAcceptableTypes(status)) {
        res.status(403).send({ error: 'Invalid status in the request.' })
        return
      }

      if (status) query.status = typeof status === 'string' ? status : { $in: status }
      return Tag.find(query)
        .populate('storedFile_id')
        .execAsync()
        .then(function(tags) {
          var mappedTags = _.map(tags, function(tag) {
            if (!tag.customTagType.length) {
              tag.customTagType =
                !tag.isSiteServed && !tag.isVPAID
                  ? 'JS'
                  : tag.isSiteServed
                  ? 'Site-Served'
                  : 'VPAID'
              //save this tag in database
              Tag.update({ _id: tag._id }, { $set: { customTagType: tag.customTagType } }, function(
                err,
                updatedTag
              ) {
                return updatedTag
              })
            } else {
              return tag
            }
          })

          res.send({
            data: mappedTags,
          })

          return tags
        })
        .catch(function(err) {
          error.log(err, error.ERROR_FETCHING_TAGS, __filename)
          return res.status(403).send({
            error:
              "Error fetching your company's tag(s). Please try again later or contact your case officer.",
          })
        })
    })
  },
  create: function create(req, res) {
    if (!req.body) return res.status(403).send({ error: 'No data supplied' })

    Tag.getNew({
      ...req.body,
      actorUser_name: req.user.name,
      actorUser_id: req.user._id,
    })
      .then(function(tag) {
        return res.send({
          data: tag,
        })
      })
      .catch(function(err) {
        error.log(err, error.ERROR_CREATING_NEW_TAG, __filename)
        return res.status(403).end()
      })
  },
  getTypeAndQuantityEnumValues: function getTypeAndQuantityEnumValues(req, res) {
    return Tag.getTypeAndQuantityEnumValues().then(function(data) {
      res.send({
        data: data,
      })
    })
  },
  downloadTag: function downloadTag(req, res) {
    Tag.findById(req.params.tag_id)
      .populate('company_id')
      .execAsync()
      .bind({})
      .then(function(tag) {
        if (!tag) throw new Error('Cannot find tag. Please try again')

  getTagVolume: function getTagVolume(req, res) {
    if (!req.params.company_id)
      return res.status(403).send({ error: 'Company identifier not provided' })
    if (!req.body.tagList || req.body.tagList === 'undefined' || !_.isArray(req.body.tagList))
      return res.send({ data: [] })

    req.body.company = req.company

    return Promise.resolve(req.company.getDruidQuery(req.body))
      .then(function() {
        return Druid.query({ type: 'tagVolume' })
      })
      .then(function(data) {
        res.send({ data: data })
      })
  },
