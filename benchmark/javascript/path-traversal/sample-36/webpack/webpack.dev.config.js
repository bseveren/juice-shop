const submodule = require('./submodule');

const config = env => {
	return {
		mode: 'development',
		entry: [`webpack-dev-server/client?http://localhost:${getPort(env)}`, './client/index.js', './client/index.css'],
		devtool: 'source-map',
		plugins: [
			...submodule.getPlugins(env, root),
			new FriendlyErrorsPlugin({
				onErrors: (severity, errors) => {
					if (severity !== 'error') {
						return;
					}
					const error = errors[0];
					notifier.notify({
						title: pkg.name,
						message: severity + ': ' + error.name,
						subtitle: error.file || ''
					});
				}
			}),
			new CleanWebpackPlugin(['war'], {
				root: path.resolve(root),
				exclude: ['build', 'public', 'server', 'WEB-INF'],
				verbose: false,
				dry: false,
				watch: true,
				beforeEmit: true
			}),
			new WriteFilePlugin()
		],
		devServer: {
			allowedHosts: ['localhost', 'localhost.com', 'localhost.dk', 'localhost.fi', 'localhost.no', 'localhost.se', 'localhost.nu', 'localhost.net'],
			contentBase: path.resolve(root, 'war'),
			hot: false,
			port: getPort(env),
			compress: true,
			proxy: {
				'*': {
					target: (env && env.proxy) || 'http://localhost:8009'
				}
			},
			publicPath: `http://localhost:${getPort(env)}/`,
			quiet: true,
			overlay: true
		}
	};
};

module.exports = (env, argv) => {
	return merge(common(env, argv), config(env));
};
