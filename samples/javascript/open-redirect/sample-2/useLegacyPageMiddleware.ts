export default function useLegacyPageMiddleware() {
    function hasParameter(ctx: Context, type: string = CustomerParameterType.Account, key: string): boolean {
        const parameter: CustomerParameter | null = ctx.$osauth.getParameter(type, key)

        if (!parameter) {
            return false
        }

        return parameter.value === '1'
    }

    async function openLegacyDetailsPageIfDoesNotHaveParameter<M extends typeof Model>(
        ctx: Context,
        type: string,
        key: string,
        parameterName: string,
        model: M,
        callback: (model: InstanceOf<M>) => string
    ): Promise<void> {
        try {
            if (hasParameter(ctx, type, key)) {
                return
            }

            if (!(parameterName in ctx.route.params)) {
                ctx.$toasts.error({
                    title: `Parameter "${parameterName}" not found in route params`,
                })

                return
            }

            const parameter = Number(ctx.route.params[parameterName])

            let modelInstance = model.find(parameter)

            if (!modelInstance) {
                await model
                    .api()
                    .show(parameter)
                    .then(() => {
                        modelInstance = model.find(parameter)
                    })
                    .catch((e: unknown) => {
                        ctx.$sentry.captureException(e)

                        ctx.redirect(entityIndexPageUrl(ctx.route.fullPath))
                    })
            }

            if (modelInstance === null) {
                throw new Error('Cannot resolve model')
            }

            const url = callback(modelInstance)
            ctx.$iFrameLayout.enable(url)
        } catch (e: unknown) {
            ctx.$sentry.captureException(e)
        }
    }

    function entityIndexPageUrl(path: string): string {
        const url: string = path.slice(0, -1) // Strip trailing slash
        const lastSlashIndex: number = url.lastIndexOf('/') // Find last slash

        return url.substring(0, lastSlashIndex + 1) // Return everything up to and including the last slash
    }

    return {
        openLegacyDetailsPageIfDoesNotHaveParameter,
    }
}
