export async function handleOAuthCallback(
    code: string,
    state: string,
    actionId?: string,
) {
  try {
    const oauthStateToken = await getToken(state);

    if (!oauthStateToken) {
      throw OAuthCallbackError.TOKEN_EXPIRED();
    }

    if (actionId && oauthStateToken.actionId !== actionId)
      throw OAuthCallbackError.INVALID_CALLBACK_URL();

    const action = await getAction(
        oauthStateToken.actionId,
        oauthStateToken.workspaceId,
    );
    const validatedAction = actionsSchema.parse(action);

    let tokenResponse;
    if (action.tokenExchangeMethod === OAuthTokenExchangeMethod.REQUEST_BODY) {
      tokenResponse = await axios.post(
          validatedAction.tokenUrl,
          {
            grant_type: "authorization_code",
            code: code,
            client_id: validatedAction.clientId,
            client_secret: validatedAction.clientSecret,
            redirect_uri:
                validatedAction.redirectUrl ??
                `${process.env.URL}/api/actions/${oauthStateToken.actionId}/callback`,
          },
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            transformRequest: [
              (data) => {
                const params = new URLSearchParams();
                for (const key in data) {
                  params.append(key, data[key]);
                }
                return params.toString();
              },
            ],
          },
      );
    } else if (
        action.tokenExchangeMethod ===
        OAuthTokenExchangeMethod.AUTHORIZATION_HEADER
    ) {
      const credentials = Buffer.from(
          `${validatedAction.clientId}:${validatedAction.clientSecret}`,
      ).toString("base64");
      tokenResponse = await axios.post(
          validatedAction.tokenUrl,
          {
            grant_type: "authorization_code",
            code: code,
            redirect_uri:
                validatedAction.redirectUrl ??
                `${process.env.URL}/api/actions/${oauthStateToken.actionId}/callback`,
          },
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: `Basic ${credentials}`,
            },
            transformRequest: [
              (data) => {
                const params = new URLSearchParams();
                for (const key in data) {
                  params.append(key, data[key]);
                }
                return params.toString();
              },
            ],
          },
      );
    } else {
      throw new Error("Unsupported token exchange method");
    }

    let accessToken = tokenResponse.data.access_token;

    if (
        action.authorizationUrl &&
        new URL(action.authorizationUrl).hostname === "slack.com"
    ) {
      accessToken = tokenResponse.data.authed_user.access_token;
    }

    await upsertActionUserCredentials(
        oauthStateToken.userId,
        oauthStateToken.actionId,
        accessToken,
        tokenResponse.data.refresh_token,
        tokenResponse.data.expires_in
            ? new Date(Date.now() + tokenResponse.data.expires_in * 1000)
            : undefined,
    );

    return oauthStateToken;
