// Emoji: 😺

module.exports = {

  /**
   * Set availability date of specified version
   *
   * (PUT /version/availability/:version/:timestamp)
   */
  availability: (req, res) => {
    const { version, timestamp } = req.params;

    if (!version) return res.badRequest('Requires `version` parameter');
    if (!timestamp) return res.badRequest('Requires `timestamp` parameter');

    const availability = new Date(parseInt(timestamp, 10));

    if (isNaN(availability) || availability.getTime().toString() !== timestamp) {
      return res.badRequest('Parameter `timestamp` must be a valid unix timestamp in milliseconds');
    }

    Version
      .findOne(version)
      .then(foundVersion => {
        if (!foundVersion) return res.notFound('The specified `version` does not exist');

        if (availability < new Date(foundVersion.createdAt)) {
          return res.badRequest(
            'Parameter `timestamp` must be greater than or equal to the version creation date'
          );
        }

        return Version
          .update(version, { availability })
          .then(([updatedVersion]) => {
            Version.publishUpdate(version, updatedVersion, req);

            res.send(updatedVersion);
          });
      })
      .catch(res.negotiate);
  },

  /**
   * Redirect the update request to the appropriate endpoint
   * (GET /update)
   */
  redirect: function(req, res) {
    var platform = req.param('platform');
    var version = req.param('version');

    if (!version) {
      return res.badRequest('Requires "version" parameter');
    }
    if (!platform) {
      return res.badRequest('Requires "platform" parameter');
    }

    return res.redirect('/update/' + platform + '/' + version);
  },

  /**
   * Sorts versions and returns pages sorted by by sermver
   *
   * ( GET /versions/sorted )
   */
  list: function (req, res) {
    Version
      .find()
      .then(versions => {
        var count = versions.length;
        var page = req.param('page') || req.query.page || 0;
        var start = page * sails.config.views.pageSize;
        var end = start + sails.config.views.pageSize;
        var items = versions
          .sort(function (a, b) {
            return -compareVersions(a.name, b.name);
          })
          .slice(start, end);

        const response = {
          total: count,
          offset: start,
          page: page,
          items: items
        }

        return Promise.all([
          // load channels
          new Promise(function (resolve, reject) {
            Promise.all(items.map(function (version) {
              return Channel.findOne({
                name: version.channel
              })
            }))
            .then(resolve)
            .catch(reject)
          }),
          // load assets
          new Promise(function (resolve, reject) {
            Promise.all(items.map(function (version) {
              return Asset.find({

  releaseNotes: function(req, res) {
    var version = req.params.version;
    const flavor = req.params.flavor || 'default';

    Version
      .findOne({
        name: version,
        availability: availabilityFilter(),
        flavor
      })
      .then(function(currentVersion) {
        if (!currentVersion) {
          return res.notFound('The specified version does not exist');
        }

        return res.format({
          'application/json': function() {
            res.send({
              'notes': currentVersion.notes,
              'pub_date': currentVersion.availability.toISOString()
            });
          },
          'default': function() {
            res.send(currentVersion.notes);
          }
        });
      })
      .catch(res.negotiate);
  },
