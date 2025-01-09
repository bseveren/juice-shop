const getPlugins = (env = {}, root = '') => {
	const customerFilesPath = path.resolve(root, '../customer-files');

	if (!isBeingRunAsSubmodule) {
		return [];
	}

	if (typeof env.company === 'string') {
		return [
			new CopyWebpackPlugin({
				patterns: [
					{from: path.resolve(customerFilesPath, env.company), to: root},
					{from: path.resolve(customerFilesPath, 'common'), to: root, noErrorOnMissing: true}
				]
			})
		];
	}

	return [
		new CopyWebpackPlugin({
			patterns: [
				{from: customerFilesPath, to: root}
			]
		})
	];
};
