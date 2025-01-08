async function redirectToStore(req, res, next) {
  if (req.path == '/' || req.path == '/store' || req.path == '/auth/_/action') {
    const { storeSlug } = req.query
    req.current_store = storeSlug
    let storequery = req
      .db('central_stores')
      .select('central_stores.*', 'configs.value as config')
      .where('host', req.headers['host'])
      .innerJoin('configs', 'configs.store_id', 'central_stores.id')
      .where('configs.name', 'webstore')
    if (req.current_store) {
      storequery.where('slug', req.current_store)
    }
    let stores = await storequery
    for (let index = 0; index < stores.length; index++) {
      let config = JSON.parse(stores[index]['config'])
      if (config?.webstoreenabled && !config.webstoreenabled) {
        stores.splice(index, 1)
      } else {
        stores[index]['config'] = JSON.parse(stores[index]['config'])
      }
    }
    let store = stores[0]
    if (
      stores.length > 0 &&
      store &&
      req.headers['host'] !==
        (process.env.ACME_HOST ? process.env.ACME_HOST : 'acme.com')
    ) {
      if (req.path == '/' || req.path == '/store') {
        if (req.cookies['CurrentStore']) {
          for (let storeindex = 0; storeindex < stores.length; storeindex++) {
            const s = stores[storeindex]
            if (s.slug == req.cookies['CurrentStore']) {
              return res.redirect('/store/' + req.cookies['CurrentStore'])
            }
          }
          return res.redirect('/store/' + store.slug)
        } else {
          return res.redirect('/store/' + store.slug)
        }
      }
    } else if (req.path == '/auth/_/action') {
      if (req?.query?.mode && req.query.mode == 'resetPassword') {
        if (
          req.headers['host'] !==
          (process.env.ACME_HOST ? process.env.ACME_HOST : 'acme.com')
        ) {
          return res.redirect('/store/' + store.slug + '/resetpassword?' + qs.stringify(req.query))
        } else {
          return res.redirect('/resetpassword?' + qs.stringify(req.query))
        }
      } else if (req?.query?.mode && req.query.mode == 'verifyEmail') {
        if (
          req.headers['host'] !==
          (process.env.ACME_HOST ? process.env.ACME_HOST : 'acme.com')
        ) {
          return res.redirect(
            '/store/' + store.slug + '/emailverification?' + qs.stringify(req.query)
          )
        } else {
          return res.redirect('/emailverification?' + qs.stringify(req.query))
        }
      } else {
        next()
      }
    } else {
      next()
    }
  } else {
    next()
  }
}
