import WebhookAPIKeyAndManagementJWTAuthorizer from "../services/WebhookAPIKeyAndManagementJWTAuthorizer";

export const handler = async (
  event: AwsHttpApiAuthorizerReque***ntV2,
  context: Context,
  callback: Callback
): Promise<APIGatewayAuthorizerResult | void> => {
  try {
    const { type } = event;

    if (!type || type !== "REQUEST") {
      throw new Error(AuthorizationErrors.ERROR_EVENT_TYPE_IS_NOT_VALID);
    }

    const { routeArn, headers, pathParameters, requestContext } =
      event as AwsHttpApiAuthorizerReque***ntV2;
    const apiKey = headers ? headers["x-api-key"] : null;
    const authorizationToken = headers?.["authorization"] || null;
    const hookId = pathParameters?.hookId || null;
    const region = requestContext.domainName.substring(
      requestContext.domainPrefix.length + 1,
      requestContext.domainPrefix.length + 3
    );

    if (!hookId) {
      throw new Error(
        AuthorizationErrors.ERROR_HOOKID_MISSING_FROM_PATH_PARAMS
      );
    }

    if (!apiKey && !authorizationToken) {
      throw new Error(
        AuthorizationErrors.ERROR_AUTHORIZAION_MISSING_FROM_HEADERS
      );
    }

    if (apiKey) {
      // Authorize an x-api-key in the headers request
      // This authentication is used for the webhook app and is only displayed to the user
      const webhookAuthorizer = new WebhookAPIKeyAndManagementJWTAuthorizer();
      return await webhookAuthorizer.authorizeAPIKey(
        apiKey,
        hookId,
        routeArn,
        region
      );
    }
    // Authorize the request coming from the editor app to create feed items
    // This is used for the quick post app
    if (authorizationToken) {
      // Verify the appManagementToken
      const managementAuthorizer = new AppViewerAndManagementJwtAuthorizer();
      await managementAuthorizer.authorize(
        authorizationToken,
        routeArn,
        AUDIENCE
      );
      // Verify the hookId belongs to the orgId and spaceId
      const webhookAuthorizer = new WebhookAPIKeyAndManagementJWTAuthorizer();
      return await webhookAuthorizer.authorizeToken(
        authorizationToken,
        hookId,
        routeArn,
        region
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      console.log(
        `Error has been thrown for ${event.rawPath}: ${error.message}`
      );
    } else {
      console.log(`Error has been thrown for ${event.rawPath}: ${error}`);
    }
    return callback("Unauthorized");
  }
};
