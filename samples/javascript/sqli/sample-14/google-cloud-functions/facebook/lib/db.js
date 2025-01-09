exports.db = {
	async connect() {
		// If connection pool already exist, reuse it.
		if (connection) {
			console.log('Reuse existing MySQL connection pool...');
			return connection;
		}

		connector = new Connector();

		let clientOpts = {};

		if (process.env?.APP_DB_CONNECTION_NAME) {
			clientOpts = await connector.getOptions({
				instanceConnectionName: process.env.APP_DB_CONNECTION_NAME,
				ipType: process.env?.APP_DB_IP_TYPE ?? 'PUBLIC',
			});
		}

		connection = await mysql.createPool({
			waitForConnections: true,
			connectionLimit: 10,
			queueLimit: 0,
			...clientOpts,
			...JSON.parse(process.env.APP_DB_PARAMS ?? '{}'),
		});

		console.log('MySQL connection pool created...');

		return connection;
	},

	async disconnect() {
		// No need to disconnect in Cloud Run functions as these are automatically gracefully closed.
	},

	async getPostByUuid(postUuid, postColumns, status = POST_STATUS.SCHEDULED) {
		const prefixedPostColumns = postColumns.map((column) => {
			return '`posts`.' + column + ' AS ' + column;
		});

		const columns = [
			'integrity_hash',
			'`posts`.id AS id',
			'`posts`.uuid as uuid',
			'`posts`.user_id AS user_id',
			'status',
			'content',
			'connection_id',
			'`post_attachments`.file_url AS file_url',
			'`post_attachments`.mime_type AS mime_type',
			'`social_accounts`.connection_id AS connection_id',
			'`social_accounts`.ext_ref AS ext_ref',
			...prefixedPostColumns,
		];

		let [rows, fields] = await connection.execute(
			'SELECT ' + columns.join(',') + ' FROM `posts` ' +
			'JOIN `social_accounts` ON `posts`.social_account_uuid = `social_accounts`.uuid ' +
			'LEFT JOIN `post_attachments` ON `posts`.id = `post_attachments`.post_id ' +
			'WHERE `posts`.uuid = ? AND `posts`.status = ?',
			[postUuid, status],
		);

		const attachments = rows
			.map(row => {
				if (!row?.file_url) {
					return;
				}

				return {
					mediaUrl: row.file_url,
					mediaType: row.mime_type,
				};
			})
			.filter(row => row);

		if (!rows.length) {
			return false;
		}

		return [rows[0], attachments];
	},

	async updatePost(postId, status = 'published') {
		if (status === POST_STATUS.FAILED) {
			return await connection.execute(
				'UPDATE `posts` ' +
				'SET published_at = NOW(), status = ?, extra_attributes = JSON_REMOVE(extra_attributes, \'$.task_name\') ' +
				'WHERE id = ?',
				[status, postId],
			);
		}

		return await connection.execute(
			'UPDATE `posts` SET published_at = NOW(), status = ? WHERE id = ?',
			[status, postId],
		);
	},

