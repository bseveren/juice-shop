import { getClassCodes } from './classCodes/getClassCodes';

export class AcmeAdapter {
  public static authToken?: string = undefined;
  public static async startSession(
    {
      agentContactId,
      authDomain,
      clientId,
      clientSecret,
      domain,
      password,
      subscriberId,
      userName
    }: {
      agentContactId: number;
      authDomain: URL;
      clientId: string;
      clientSecret: string;
      domain: URL;
      password: string;
      subscriberId: string;
      userName: string;
    },
    logger: Context['logger'] // note: we're not storing the context inside the adapter -- it's not worth the cyclic dependency
  ): Promise<AcmeAdapter> {
    const getAuthToken = async (): Promise<string> => {
      const endpoint = new URL(`${authDomain}/OpenIdConnect/Token`);

      const authResponse = await axios({
        method: 'POST',
        url: endpoint.toString(),
        data: new URLSearchParams({
          grant_type: 'password',
          client_id: clientId,
          client_secret: clientSecret,
          username: userName,
          password: password,
          scope: 'openid profile legacy_info legacy_id',
          response_type: 'token id_token'
        }),
        headers: {
          'cache-control': 'no-cache,no-cache',
          'content-type': 'application/x-www-form-urlencoded'
        },
        timeout: ACME_DEFAULT_TIMEOUT
      });

      const { access_token } = authResponse.data;

      if (typeof access_token !== 'string') {
        throw new Error(
          "Unreachable - Acme authentication API doesn't return the access_token"
        );
      }

      logger.debug('Got Acme AuthToken');

      return access_token;
    };

    logger.debug('Starting an Acme session', { authDomain, domain });

    const authToken = await getAuthToken();

    return new AcmeAdapter(agentContactId, domain, authToken, subscriberId);
  }

  public static isSupportedState(state: UsState): state is UnsupportedState {
    return !ACME_WC_UNSUPPORTED_STATES.has(state as UnsupportedState);
  }

  constructor(
    private agentContactId: number,
    private domain: URL,
    private authToken: string,
    private subscriberId: string
  ) {}

  public getClassCodes(params: {
    state: UsState;
  }): ReturnType<typeof getClassCodes> {
    return getClassCodes({
      domain: this.domain,
      authToken: this.authToken,
      subscriberId: this.subscriberId,
      ...params
    });
  }
