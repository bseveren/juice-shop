export const saveAsDocumentThunk = createAsyncThunk(
    'documents/saveAsDocument',
    async ({ endpoint, token }: { endpoint: string; token: string }, { dispatch, rejectWithValue }) => {
        const httpConfig = { ...hhtpHeadersConfig };

        try {
            const document = await window.StudioSDK.document
                .getCurrentState()
                .then((res) => {
                    return res;
                })
                .catch(() => {
                    throw new Error('There was an issue fetching the current document state');
                });

            if (!document.data) throw new Error('The document is empty');

            if (token) {
                httpConfig.headers = { ...httpConfig.headers, Authorization: `Bearer ${token}` };
            }
            const response = await axios
                .post(endpoint, JSON.parse(document.data), httpConfig)
                .then((res) => {
                    return { data: res.data };
                })
                .catch((err) => {
                    throw err;
                });
            dispatch(clearBackgroundTask(BackgroundTaskName.SAVE));

            return response;
        } catch (error) {
            dispatch(clearBackgroundTask(BackgroundTaskName.SAVE));
            return rejectWithValue((error as Error).message);
        }
    },
);

export const updateDocumentThunk = createAsyncThunk(
    'documents/updateDocuments',
    async ({ endpoint, token, body }: { endpoint: string; token: string; body: unknown }) => {
        const httpConfig = { ...hhtpHeadersConfig };

        if (token) {
            httpConfig.headers = { ...httpConfig.headers, Authorization: `Bearer ${token}` };
        }

        const response = await axios
            .put(endpoint, body, httpConfig)
            .then((res) => {
                return res.data;
            })
            .catch((err) => {
                throw new Error(err.response.data.detail);
            });
        return response;
    },
);

type HttpHeaders = { headers: { 'Content-Type': string; Authorization?: string } };

export const fetchDocumentThunk = createAsyncThunk(
    'documents/fetchDocuments',
    async ({ endpoint, token }: { endpoint: string; token?: string }) => {
        const httpConfig = { ...hhtpHeadersConfig };

        if (token) {
            httpConfig.headers = { ...httpConfig.headers, Authorization: `Bearer ${token}` };
        }

        const response = await axios
            .get(endpoint, httpConfig)
            .then((res) => {
                return res.data;
            })
            .catch((err) => {
                // eslint-disable-next-line no-console
                console.warn(err);
                return null;
            });
        return response;
    },
);
