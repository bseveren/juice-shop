import * as API from './API'

export const httpEditorPublicClient: (url: string) => EditorPublicClient =
    (url) => ({
        getHealthZ: abortSignal => API.getHealthZ(url)({abortSignal})
    })
