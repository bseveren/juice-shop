async function get_app_server() {
	const app = express();
	
	if (process.env.SENTRY_ENABLED === "true") {
		Sentry.init({
			dsn: process.env.SENTRY_DSN,
			integrations: [
				// enable HTTP calls tracing
				new Sentry.Integrations.Http({ tracing: true }),
				// enable Express.js middleware tracing
				new Tracing.Integrations.Express({ app }),
				// add beta profiling integration
				new Profiling.ProfilingIntegration()
			],
			// 1.0 is 100% capture rate
			profilesSampleRate: 1.0,
			tracesSampleRate: 0.01,
		});

		// RequestHandler creates a separate execution context using domains, so that every
		// transaction/span/breadcrumb is attached to its own Hub instance
		app.use(Sentry.Handlers.requestHandler());
		// TracingHandler creates a trace for every incoming request
		app.use(Sentry.Handlers.tracingHandler());
		app.use(Sentry.Handlers.errorHandler());
	}

	app.set('trust proxy', true);
	app.disable('x-powered-by');

	// I have a question for Express:
	// https://youtu.be/ZtjFsQBuJWw?t=4
	app.set('case sensitive routing', true);
	
	app.use(bodyParser.json());

    // Set security-related headers on requests
    app.use(async function(req, res, next) {
    	set_secure_headers(req, res);
    	next();
    });

    // Handler for HTML pages collected by payloads
    const CollectedPagesCallbackSchema = {
    	"type": "object",
    	"properties": {
    		"uri": {
    			"type": "string",
    			"default": ""
    		},
    		"html": {
    			"type": "string",
    			"default": "" 
    		},
    	}
    };
    app.post('/page_callback', upload.none(), validate({body: CollectedPagesCallbackSchema}), async (req, res) => {
		res.set("Access-Control-Allow-Origin", "*");
		res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
		res.set("Access-Control-Allow-Headers", "Content-Type, X-Requested-With");
		res.set("Access-Control-Max-Age", "86400");

		const page_insert_response = await CollectedPages.create({
			id: uuid.v4(),
			uri: req.body.uri,
			html: req.body.html,
		});

		// Send the response immediately, they don't need to wait for us to store everything.
		res.status(200).json({
			"status": "success"
		}).end();
	});

    // Handler for XSS payload data to be received
    const JSCallbackSchema = {
    	"type": "object",
    	"properties": {
    		"uri": {
    			"type": "string",
    			"default": ""
    		},
    		"cookies": {
    			"type": "string",
    			"default": ""
    		},
    		"referrer": {
    			"type": "string",
    			"default": ""
    		},
    		"user-agent": {
    			"type": "string",
    			"default": ""
    		},
    		"browser-time": {
    			"type": "string",
    			"default": "0",
    			"pattern": "^\\d+$"
    		},
    		"probe-uid": {

    app.post('/js_callback', upload.single('screenshot'), validate({body: JSCallbackSchema}), async (req, res) => {
		res.set("Access-Control-Allow-Origin", "*");
		res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
		res.set("Access-Control-Allow-Headers", "Content-Type, X-Requested-With");
		res.set("Access-Control-Max-Age", "86400");

		// Send the response immediately, they don't need to wait for us to store everything.
		res.status(200).json({
			"status": "success"
		}).end();

        if(req.get('host') != process.env.XSS_HOSTNAME) {
            console.debug(`got bad host ${req.get('host')}`);
            return res.redirect("/app/")
        }
        const userPath = req.body.path;
        if (!userPath){
            console.debug("req had no user path ID");
            return
        }

        const user = await Users.findOne({ where: { 'path': userPath } });

        if (user === null){
            console.debug("No user found for path provided");
            return
        }

        console.debug(`Got payload for user id ${user.id}`);
        
        const userID = user.id;
        let encrypted = false;
        if ("encrypted_data" in req.body){
            encrypted = true;
        }

    	// Multer stores the image in the /tmp/ dir. We use this source image
    	// to write a gzipped version in the user-provided dir and then delete
    	// the original uncompressed image.
    	const payload_fire_image_id = uuid.v4();
        let payload_fire_image_filename = "";
        let filename_in_bucket = "";
        if(!encrypted){
    	    payload_fire_image_filename = `${SCREENSHOTS_DIR}/${payload_fire_image_id}.png.gz`;
            filename_in_bucket = `${payload_fire_image_id}.png.gz`;
        }else{
    	    payload_fire_image_filename = `${SCREENSHOTS_DIR}/${payload_fire_image_id}.b64png.enc.gz`;
            filename_in_bucket = `${payload_fire_image_id}.b64png.enc.gz`;
        }
    	const multer_temp_image_path = req.file.path;

    	// We also gzip the image so we don't waste disk space
    	const gzip = zlib.createGzip();
    	const output_gzip_stream = fs.createWriteStream(payload_fire_image_filename);
    	const input_read_stream = fs.createReadStream(multer_temp_image_path);
    	// When the "finish" event is called we delete the original
    	// uncompressed image file left behind by multer.
        if (process.env.USE_CLOUD_STORAGE == "true"){
            const storage = new Storage();
            //creating a bucket instance
            const bucket = storage.bucket(process.env.BUCKET_NAME);
            //compressing the file using gzip
            const gzip = zlib.createGzip();
            const gzipTempFileName = multer_temp_image_path + ".gz";
            const tempFileWriteStream = fs.createWriteStream(gzipTempFileName);
            input_read_stream.pipe(gzip).pipe(tempFileWriteStream);
            // Wait for the file to be finished writing
            await new Promise((resolve, reject) => {
                tempFileWriteStream.on('finish', resolve);
                tempFileWriteStream.on('error', reject);
            });
            //uploading the gzipped file to GCS
            await bucket.upload(gzipTempFileName, {
                gzip: true,
                destination: filename_in_bucket,
                metadata: {
                    cacheControl: 'public, max-age=31536000',
                },
            });
            console.debug(`${payload_fire_image_id}.png.gz has been uploaded to GCS.`);
            await asyncfs.unlink(multer_temp_image_path);
            await asyncfs.unlink(gzipTempFileName);
        }else{
            input_read_stream.pipe(gzip).pipe(output_gzip_stream).on('finish', async (error) => {
                if(error) {
                    console.error(`An error occurred while writing the XSS payload screenshot (gzipped) to disk:`);
                    console.error(error);
                }

                console.debug(`Gzip stream complete, deleting multer temp file: ${multer_temp_image_path}`);

                await asyncfs.unlink(multer_temp_image_path);
            });
        }
    	const payload_fire_id = uuid.v4();
        let payload_fire_data = {}
        if(encrypted){
            if (req.body.encrypted_data.length > 100000){
                Sentry.captureMessage(`encrypted data length too long: ${req.body.encrypted_data.length}`);
                return res.status(400).json({
