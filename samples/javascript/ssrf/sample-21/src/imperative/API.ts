import * as Http from './http'

export const getHealthZ = (url: string) =>
    pipe(
        Http.get(`${url}/healthz`, { }),
        ATEmapFailure(cause => cause.code === 'ERR_NETWORK' ? editorNotReachable(cause) : httpError(cause)),
        ATEflatMap(flow(
            HealthZResponseZ.safeParse,
            r => r.success ? ATEok(r.data) : ATEfail(decodeError(r.error))
        )),
        collapseResult
    )
