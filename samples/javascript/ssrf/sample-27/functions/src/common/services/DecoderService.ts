const getIDToken = async (audience: string | undefined): Promise<string> => {
    checkNotNull(audience, 'Audience is required param to get ID Token');
    const presentInCache = tokenCache.has(audience!);

    if (!presentInCache || tokenCache.get(audience!)!.expiry < Date.now()) {
        let token: string;
        if (commonConfigService.get().isProdEnv) {
            const metadataServerUri = getMetadataServerUri(audience!);
            const result = await axios.get(metadataServerUri, {
                headers: {
                    'Metadata-Flavor': 'Google',
                },
            });
            token = result.data;
        } else {
            const client = await auth.getIdTokenClient(audience!);

            // Fetch the client request headers and add them to the service request headers.
            // The client request headers include an ID token that authenticates the request.
            const clientHeaders = await client.getRequestHeaders();
            token = clientHeaders['Authorization'].split('Bearer ')[1];
        }
        const payloadString = String(token).split('.')[1];
        const payload = JSON.parse(Base64.atob(payloadString));

        const expiry = payload && payload.exp ? expToMillis(payload.exp) : Date.now();

        tokenCache.set(audience!, {
            expiry,
            token,
        });
    } 
    return tokenCache.get(audience!)!.token;
};

const invokeCallable = async <T>(params: CallableParams): Promise<T> => {
    const {audience, url, data} = params;
    const {isEmulatorDemoProject, projectId} = createGoogleConfigService().get();
    const token = isEmulatorDemoProject ? projectId : await getIDToken(audience);

    // TODO (Future): use functions/src/common/services/RequestsService.ts instead
    return axios
        .post(url, data, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        })
        .then((resp) => {
            return resp.data;
        })
        .catch((error) => {
            console.error(`callable ${url} error`, error.toString());
            return Promise.reject(error);
        });
};
