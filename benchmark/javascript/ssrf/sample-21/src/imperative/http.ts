export const get = (url: string, config?: AxiosRequestConfig): AbortableTaskEither<AxiosError, unknown> =>
    sendRequest(context => axios.get(url, { ...config, signal: context.abortSignal }).then(value => ATEok(value)));
