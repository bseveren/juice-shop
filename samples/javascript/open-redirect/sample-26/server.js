const { StoreMiddlewares } = require('./middlewares/getStore')

app
  .prepare()
  .then(async () => {
    const server = express()
    server.set({timeout: 300000,maxRequestsPerSocket : 3000});
    server.use(cors());
   
    server.use(cookieParser())

    sgKey = await getSendgridApiKey()
    let map_api_key  = await getSecret('GOOGLE_MAP_API_KEY')
    let adyen_api_key = await getSecret(process.env.NODE_ENV == 'production' && (process.env.ACME_HOST != 'stg.acme.com' || !process?.env?.ACME_HOST ) ? 'ADYEN_PROD_API_KEY' :'ADYEN_TEST_API_KEY')
    console.log("getkey ::",process.env.NODE_ENV == 'production' && (process.env.ACME_HOST != 'stg.acme.com' || !process?.env?.ACME_HOST ) ? 'ADYEN_PROD_API_KEY' :'ADYEN_TEST_API_KEY')
    try {
      server.use(async function(req, res, next) {
        if (!centralconn) {
          centralconn = await getDbConnection()
        }
        req.fbAdmin = fbAdmin
        req.db = centralconn
        req.sgKey = sgKey
        req.secretClient = client
        req.map_api_key = map_api_key
        req.adyen_api_key = adyen_api_key
        next()
      })
      server.get('/status', function(req, res) {
        res.status(200).send()
      })
      server.post(
        '/maintenance/uploadimage/:storeSlug',
        upload.single('image'),
        async (req, res) => {
          console.log('inside image upload')
          let { storeSlug } = req.params
          req.current_store = storeSlug
          let storequery = req.db('central_stores').where('host', req.headers['host'])
          if (req.current_store) {
            storequery.where('slug', req.current_store)
          }
          let stores = await storequery
          let store = stores[0]
          if (!store) {
            return res.status(404).send({})
          } else {
            req.bpstore = store
          }
          if (req.bpstore.image_edit_allowed) {
            try {
              let storeitemid = req.body.productId ? req.body.productId : null
              let itemcode = []
              if (storeitemid) {
                // fetch code
                let stock_codes = await req
                  .db('ws_stored_items')
                  .select('stock_codes')
                  .where('storeitemid', storeitemid)
                  .andWhere('store_id', req.bpstore.id)
                  .first()
                stock_codes = JSON.parse(stock_codes.stock_codes)
                if (Array.isArray(stock_codes) && stock_codes.length > 0) {
                  itemcode = stock_codes.length > 0 ? stock_codes[0].code : []
                } else {
                  res.status(400).send()
                }
                // console.log('itemcode----', itemcode)
              }
              let success = await saveFile(req.file.buffer, itemcode, req.db, req.centraldb)
              // console.log('success-', success)
              if (success) {
                let protocol = process.env.IMAGEPROXY_PROTOCOL || 'https';
                let url = `${protocol}://${process.env.CENTRAL_SERVER_URL}/images/${success}`;
                res
                  .status(200)
                  .json({ url: url})
              } else {
                res.status(400).send()
              }
            } catch (e) {
              console.log('server image upload e----', e)
              res.status(400).send()
            }
          } else {
            res.status(401).send()
          }
        }
      )
      server.post('/maintenance/removeimage/:storeSlug', jsonParser, async (req, res) => {
        let { storeSlug } = req.params
        req.current_store = storeSlug
        let storequery = req.db('central_stores').where('host', req.headers['host'])
        if (req.current_store) {
          storequery.where('slug', req.current_store)
        }
        let stores = await storequery
        let store = stores[0]
        if (!store) {
          return res.status(404).send({})
        } else {
          req.bpstore = store
        }
        if (req.bpstore.image_edit_allowed) {
          // console.log(req.body)
          let itemcode = []
          let storeitemid = req.body.productId
          if (storeitemid) {
            // fetch code
            let stock_codes = await req
              .db('ws_stored_items')
              .select('stock_codes')
              .where('storeitemid', storeitemid)
              .andWhere('store_id', req.bpstore.id)
              .first()

                'row_number() over (partition by si.storeitemid order by si.storeitemid) AS rno'
              )
            )
            .from({ products: 'central_products' })
            .leftJoin({ sc: 'central_categories' }, function() {
              this.on('sc.id', 'products.category_id').andOn('sc.level', 2)
            })
            .leftJoin({ cat: 'central_categories' }, function() {
              this.on(function() {
                this.on('cat.id', 'sc.parent')
                this.orOn('cat.id', 'products.category_id')
              }).andOn('cat.level', 1)
            })
            .leftJoin({ scg: 'central_categories' }, function() {
              this.on(function() {
                this.on('scg.id', 'cat.parent')
                this.orOn('scg.id', 'products.category_id')
              }).andOn('scg.level', 0)
            })
            .innerJoin({ psize: 'central_product_sizes' }, 'psize.product_id', 'products.id')
            .innerJoin({ psc: 'central_product_stock_codes' }, 'psc.product_size_id', 'psize.id')
            .innerJoin({ size: 'central_sizes' }, 'size.id', 'psize.size_id')
            .innerJoin({ storestock: 'store_stock_codes' }, function() {
              this.on('storestock.stock_code', '=', 'psc.stock_code')
            })
            .innerJoin({ si: 'store_stored_items' }, 'si.storeitemid', 'storestock.stored_item_id')
            .where('si.store_id', store.id)
            .where('storestock.store_id', store.id)
            .whereIn('products.id', item_ids)

          let miscscat = await req.db
            .from('central_categories')
            .where('name', 'like', 'EXTRAS%')
            .where('level', '=', 0)
            .first()
          // console.log(miscscat);
          let miscsize = await req.db
            .from('central_sizes')
            .where('name', 'like', 'Misc%')
            .first()
          let items = await req.db.from({ itable: query }).where('itable.rno', 1)
          let newitems = []
          for (let i = 0; i < items.length; i++) {
            let item = items[i]
            newitems.push({
              store_id: item.store_id,
              storeitemid: item.storeitemid,
              code: item.code,
              price: item.price,
              taxid: item.taxid,
              cost: item.cost,
              margin: item.margin,
              description: item.description,
              catgroupid:
                item.catgroupid != null || item.categoryid != null || item.subcategoryid != null
                  ? item.catgroupid
                  : miscscat.id,
              categoryid: item.categoryid,
              subcategoryid: item.subcategoryid,
              modifiers: item.modifiers,
              qty: item.qty,
              itemrank: item.itemrank,
              type: item.type,
              stock_codes: item.stock_codes,
              total_stock: item.total_stock,
              itemtags: item.itemtags,
              minprice: item.minprice,
              notes: item.notes,
              showtoweb: item.showtoweb,
              codes: item.codes,
              centralitemid: item.centralitemid,
              name: item.name,
            })
          }
          // console.log(newitems.length);
          await req.db
            .from('ws_stored_items')
            .del()
            .whereIn('centralitemid', item_ids)

          await req.db.batchInsert('ws_stored_items', newitems, 50)

          res.send(items)
        } else {
          res.status(401).send()
        }
      })

      server.get('/send/unprocessedOrders', async (req, res) => {
        await axios.get(protocol + host + '/api/sendUnprocessedOrdersToPos')
        res.end()
      })

      server.get('/service-worker.js', (req, res) => {
        app.serveStatic(req, res, path.join(__dirname, '.next', 'static', 'service-worker.js'))
      })

      server.get('/pages-manifest.json', (req, res) => {
        app.serveStatic(req, res, path.join(__dirname, '.next', 'server', 'pages-manifest.json'))
      })
      // server.use(Bugsnag)
      server.use(StoreMiddlewares.redirectToStore)
