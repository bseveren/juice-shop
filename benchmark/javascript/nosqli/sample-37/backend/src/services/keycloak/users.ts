export async function getUserLocaleKeycloak(provider: KeycloakAdminClientProvider, kcUserId: string | null): Promise<string> {
	if (!kcUserId) {
		return I18N.DEFAULT_LANGUAGE;
	}
	const client = await provider.getKeycloakAdminClient();
	const user = await client.users.findOne({id: kcUserId, realm: KEYCLOAK.REALM});
	const userAttributes = keycloakUserChangemakerAttributesSchema.parse(user?.attributes);
	return userAttributes?.locale?.[0] ?? I18N.DEFAULT_LANGUAGE;
}
