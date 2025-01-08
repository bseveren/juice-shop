class WebhookAPIKeyAndManagementJWTAuthorizer implements WebhookAuthorizer {
  async authorizeAPIKey(
    apiKey: string,
    hookId: string,
    methodArn: string,
    region: string
  ): Promise<APIGatewayAuthorizerResult> {
    try {
      // Get the hook item from platform database
      const hookItem = await getHookItem(hookId, region);
      const connectionId = hookItem.connectionId;

      // Get the connection access token from the database
      const connectionAPIKey = await getConnectionToken(
        hookItem.orgId,
        hookItem.spaceId,
        connectionId,
        "webhook",
        "webhook",
        region
      );

      // Verify the API key is valid against hoodId
      if (connectionAPIKey !== apiKey) {
        console.error(AuthorizationErrors.ERROR_VALIDATING_API_KEY);
        throw new Error(AuthorizationErrors.ERROR_VALIDATING_API_KEY);
      }

      return {
        principalId: hookItem.orgId,
        policyDocument: allowPolicy(methodArn),
        context: {
          orgId: hookItem.orgId,
          spaceId: hookItem.spaceId,
          serviceId: hookItem.serviceId,
        },
      };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
  async authorizeToken(
    token: string,
    hookId: string,
    methodArn: string,
    region: string
  ): Promise<APIGatewayAuthorizerResult> {
    try {
      // Get the hook item from platform database
      const hookItem = await getHookItem(hookId, region);
      const webToken = parseBearerToken(token);
      const decodedWebToken = await validateToken(webToken);

      if (!decodedWebToken) {
        console.error(AuthorizationErrors.ERROR_VALIDATING_JWT_PAYLOAD);
        throw new Error(AuthorizationErrors.ERROR_VALIDATING_JWT_PAYLOAD);
      }

      if (
        hookItem.orgId === decodedWebToken.org_id &&
        hookItem.spaceId === decodedWebToken.space_id
      ) {
        return {
          principalId: hookItem.orgId,
          policyDocument: allowPolicy(methodArn),
          context: {
            orgId: hookItem.orgId,
            spaceId: hookItem.spaceId,
            serviceId: hookItem.serviceId,
          },
        };
      }
      throw new Error(AuthorizationErrors.ERROR_VALIDATING_JWT_PAYLOAD);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}
