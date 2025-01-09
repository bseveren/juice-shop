};

const keyValueStoreEndpoints = {
	'local': 'http://localhost:50008',
	'qa': 'https://qa-keyvaluestore.***.com',
	'dev': 'https://dev-keyvaluestore.***.com',
	'staging': 'https://keyvaluestore-stg.***.com',
	'production': 'https://keyvaluestore.***.com',
	'pink': 'https://keyvaluestore.***.com',
};

const notificationsEndpoints = {
	'local': 'http://localhost:50005',
	'qa': 'https://notifications-qa.***.com',
	'dev': 'https://notifications-dev.***.com',
	'staging': 'https://notifications-staging.***.com',
	'production': 'https://notifications.***.com',
	'pink': 'https://notifications.***.com',
};

const businessHubsEndpoints = {
	'local': 'http://localhost:50006',
	'qa': 'https://business-hub-qa.***.com',
	'dev': 'https://business-hub-dev.***.com',
	'staging': 'https://business-hub-staging.***.com',
	'production': 'https://business-hub.***.com',
	'pink': 'https://business-hub.***.com',
};

const authorityEndpoints = {
	'local': 'https://authority-api-qa.***.com',
	'qa': 'https://authority-api-qa.***.com',
	'dev': 'https://authority-dev.***.com',
	'staging': 'https://authority-api-staging.***.com',
	'production': 'https://authority.***.com',
	'pink': 'https://authority.***.com',
};

const v1Endpoints = {
	'local': 'http://localhost:49980',
	'qa': 'https://qa.***.com',
	'dev': 'https://dev-v1.***.com',
	'staging': 'https://staging.***.com',
	'production': 'https://app.***.com',
	'pink': 'https://apptest.***.com',
};

const sisenseEndpoints = {
	'local': 'https://sisense-test.***.com',
	'qa': 'https://sisense-qa.***.com',
	'dev': 'https://sisense-test.***.com',
	'staging': 'https://sisense-staging.***.com',
	'production': 'https://sisense.***.com',
	'pink': 'https://sisense-test.***.com',
};

function setupProxy(url, target, path) {
	app.use(httpProxyMiddleware([url], {
		target: target,
		changeOrigin: true,
		ws: true,
		pathRewrite: {
			[path]: ''
		}
	}));
}


if (!argv['use-mocks']) {
	setupProxy('/domains', getEndpoint(endpoint, domainsEndpoints), '^/domains');
	setupProxy('/dataio', getEndpoint(endpoint, dataioEndpoints), '^/dataio');
	setupProxy('/dataread', getEndpoint(endpoint, datareadEndpoints), '^/dataread');
	setupProxy('/channels', getEndpoint(endpoint, channelsEndpoints), '^/channels');
	setupProxy('/print/', getEndpoint(endpoint, printEndpoints), '^/print');
	setupProxy('/keyvaluestore', getEndpoint(endpoint, keyValueStoreEndpoints), '^/keyvaluestore');
	setupProxy('/businesshub/', getEndpoint(endpoint, businessHubsEndpoints), '^/businesshub');
	setupProxy('/authority', getEndpoint(endpoint, authorityEndpoints), '^/authority');
	setupProxy('/v1', getEndpoint(endpoint, v1Endpoints), '^/v1')
	setupProxy('/sisense', getEndpoint(endpoint, sisenseEndpoints), '^/sisense')
	setupProxy('/notificationapi', getEndpoint(endpoint, notificationsEndpoints), '^/notificationapi')
	setupProxy('/signupapi', getEndpoint(endpoint, signupEndpoints), '^/signupapi')
	setupProxy('/legacy-to-be-removed', getEndpoint(endpoint, v2ProxyEndpoints), '^/legacy-to-be-removed');
}

app.use(webpackDevMiddleware(compiler, {
	hot: true,
	filename: 'main.js',
	publicPath: '/',
	stats: {
		colors: true
	},
	historyApiFallback: true
}));

app.use(webpackHotMiddleware(compiler, {
	log: console.log,
	path: '/__webpack_hmr',
	heartbeat: 10 * 1000
}));

app.use('/styles', (req, res, next) => {
	const filename = path.join(rootDir, 'styles', req.url.replace(/\.css$/, '.less'));

	fs.lstat(filename, (error, stats) => {
		if(error || !stats.isFile()) {
			next();
		} else {
			fs.readFile(filename, (err, data) => {
				if(err) {
					next();
				} else {
					less.render(data.toString(), {
						filename,
						sourceMap: { sourceMapFileInline: true, outputSourceFiles: true }
					}, (err, output) => {
						if(err) {
							const pretty = `${err.type}Error: ${err.filename}: ${err.message} (${err.line}:${err.column})`;
							console.log(`\x1b[36m${pretty}\x1b[0m`);
							res.status(500);
							res.header('Content-Type', 'text/plain');
							res.send(pretty);
						} else {
							res.header('Content-Type', 'text/css');
							res.send(output.css);
						}
					});
				}
			});
		}
	});
});
