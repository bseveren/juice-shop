export class AuthService {
  private client: CognitoIdentityProviderClient;
  public authenticator: Authenticator<AuthenticatedUser>;

  constructor(
    private config: AuthConfig,
    sessionStorage: SessionStorage,
  ) {
    this.client = new CognitoIdentityProviderClient({
      region: config.cognitoRegion,
    });
    this.authenticator = new Authenticator<AuthenticatedUser>(sessionStorage);
  }

  private calculateSecretHash(username: string): string {
    const message = username + this.config.cognitoAppClientId;
    const hmac = crypto.createHmac("SHA256", this.config.cognitoAppClientSecret);
    return hmac.update(message).digest("base64");
  }

  async getUserInfo(accessToken: string) {
    try {
      const command = new GetUserCommand({
        // biome-ignore lint/style/useNamingConvention: <explanation>
        AccessToken: accessToken,
      });

      const response = await this.client.send(command);

      // Extract relevant user attributes
      const attributes = response.UserAttributes?.reduce(
        (acc, attr) => {
          if (attr.Name && attr.Value) {
            acc[attr.Name] = attr.Value;
          }
          return acc;
        },
        {} as Record<string, string>,
      );

      return {
        username: response.Username,
        attributes,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`ユーザー情報の取得に失敗しました: ${error.message}`);
      }
      throw new Error("ユーザー情報の取得に失敗しました");
    }
  }

  async performLogin(request: Request, email: string, password: string) {
    try {
      const secretHash = this.calculateSecretHash(email);

      const command = new InitiateAuthCommand({
        // biome-ignore lint/style/useNamingConvention: <explanation>
        AuthFlow: "USER_PASSWORD_AUTH",
        // biome-ignore lint/style/useNamingConvention: <explanation>
        ClientId: this.config.cognitoAppClientId,
        // biome-ignore lint/style/useNamingConvention: <explanation>
        AuthParameters: {
          // biome-ignore lint/style/useNamingConvention: <explanation>
          USERNAME: email,
          // biome-ignore lint/style/useNamingConvention: <explanation>
          PASSWORD: password,
          // biome-ignore lint/style/useNamingConvention: <explanation>
          SECRET_HASH: secretHash,
        },
      });

      const response = await this.client.send(command);

      if (!response.AuthenticationResult?.AccessToken) {
        throw new Error("認証に失敗しました");
      }

      // After successful authentication, get user info
      const userInfo = await this.getUserInfo(response.AuthenticationResult.AccessToken);

      // Check if corpID exists
      const corpId = userInfo.attributes?.["custom:corpID"];
      if (!corpId) {
        throw new Error("企業IDが設定されていないユーザーです");
      }

      // Create user object from token and user info
      const user: AuthenticatedUser = {
        accessToken: response.AuthenticationResult.AccessToken,
        tokenExpiry: response.AuthenticationResult.ExpiresIn ?? 3600,
        email: email,
        corpId,
      };

      // Store in session
      const session = await getSession(request.headers.get("Cookie"));
      session.set(this.authenticator.sessionKey, user);

      return redirect("/dashboard", {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      });
    } catch (_error) {
      // More specific error messages based on the error type
      if (_error instanceof Error) {
        if (_error.name === "NotAuthorizedException") {
          throw new Error("メールアドレスまたはパスワードが間違っています");
        }
        if (_error.name === "UserNotFoundException") {
          throw new Error("ユーザーが見つかりません");
        }
        if (_error.name === "InvalidParameterException") {
          throw new Error("入力内容に誤りがあります");
        }
        throw new Error(`認証エラー: ${_error.message}`);
      }
      throw new Error("ログインに失敗しました");
    }
  }
