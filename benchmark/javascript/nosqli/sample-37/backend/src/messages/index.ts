import { getUserLocaleKeycloak } from 'services/keycloak/users';

export async function handleMessages(payload: unknown, {pgClient, logger}: JobHelpers): Promise<void> {
	const { userId } = payload as MessagePayload;

	const relevantPlugins = MessagingController.plugins;
	const pluginNames = relevantPlugins.map(([name]) => name);

	// wait for locks on the message table to disappear (workaround for https://app.shortcut.com/***/story/7107/race-conditions-when-starting-immediate-jobs)
	const pauseSeconds = 0.5;
	for (let tries = 0; ; tries++) {
		const {rows: locks} = await pgClient.query<object>("SELECT * FROM pg_locks WHERE relation = 'message'::regclass");
		if (!locks.length) {
			break;
		}
		logger.info('Currently pending transactions: ' + JSON.stringify(locks));
		if (tries >= 10) {
			logger.error(`Handling messages for user ${userId} couldn't get a lock on the 'message' table for ${tries * pauseSeconds} seconds, something is fishy here.`);
			// TODO: consider throwing an error to have graphile-worker re-attempt the task (with backoff)?
			return;
		}
		await new Promise(resolve => { setTimeout(resolve, pauseSeconds * 1000); });
	}

	const {rows: [recipientData]} = await pgClient.query<{
		id: number;
		email: string;
		firstname: string;
		lastname: string;
		fullname: string;
		keycloak_id: string | null;
		is_deleted: boolean;
		invited: boolean;
		messages: [{id: number, projectId: number, messageType: MessageType, handlers: string[]}] | null
	}>(
		`SELECT
			u.id,
			u.email,
			u.first_name AS firstname,
			u.last_name AS lastname,
			u.user_full_name AS fullname,
			u.keycloak_id,
			u.is_deleted,
			u.invited IS NOT NULL AS invited,
			(
				SELECT json_agg(json_build_object(
					'id', m.id,
					'messageType', m.type,
					'projectId', p.id,
					'handlers', metadata->'handlers'
				))
				FROM message m
				LEFT OUTER JOIN project p ON p.rootnode_id = (ancestors_and_self(m.referenced_node_id))[1]
				WHERE m.recipient_id = u.id
				  AND metadata->'handlers' ?| $2
				  AND (expiry_date IS NULL OR expiry_date > now())
			) AS messages
		FROM "user" u
		WHERE u.id = $1`,
		[userId, pluginNames]
	);

	if (!recipientData) throw new Error(`User ${userId} not found.`);
	logger.info(`${recipientData.messages?.length ?? 0} messages to handle for user ${userId}`);
	if (!recipientData.messages) return;

	// FIXME: use a global KeycloakAdminClientProvider, or one per controller, that keeps the client across invocations.
	// Will need automatic access token refresh though! https://github.com/keycloak/keycloak-ui/tree/main/libs/keycloak-admin-client#usage
	const locale = await getUserLocaleKeycloak({getKeycloakAdminClient: connectAdminKeycloak}, recipientData.keycloak_id);
	const results = await Promise.all(
		relevantPlugins.map(async ([name, plugin]) => {
			const messagesToHandle = recipientData.messages!.filter(row => row.handlers.includes(name));
			const result = await plugin.handleMessages({...recipientData, locale}, messagesToHandle, pgClient, logger);
			return {name, result};
		})
	);

	for (const {name, result} of results) {
		const nodeIds: number[] = [];
		for (const [nodeId, value] of result) {
			if (value) {
				nodeIds.push(nodeId);
			}
		}
		if (nodeIds.length) {
			await pgClient.query(
				`UPDATE message
				SET metadata = jsonb_set(metadata, '{handlers}', (metadata->'handlers') - $1::text[])
				WHERE id = ANY ($2)`,
				[[name], nodeIds]
			);
		}
	}
}
