/* eslint-disable @typescript-eslint/no-require-imports */
import path from 'path'
import express from 'express'
import compression from 'compression'
import logger from 'pino-http'
import { createRequestHandler } from '@remix-run/express'

const sentryCreateRequestHandler = createRequestHandler

const app = express()

// Remix fingerprints its assets so we can cache forever.
app.use(
	'/build',
	express.static('public/build', { immutable: true, maxAge: '1y' }),
)

app.use((req, res, next) => {
	// helpful headers:
	res.set('x-fly-region', process.env.FLY_REGION ?? 'unknown')
	res.set(
		'Strict-Transport-Security',
		`max-age=${(60 * 60 * 24 * 365 * 100).toString()}`,
	)
	res.set('cache-control', 'no-cache')
	res.set('x-frame-options', 'SAMEORIGIN')
	res.set('X-Content-Type-Options', 'nosniff')

	// /clean-urls/ -> /clean-urls
	if (req.path.endsWith('/') && req.path.length > 1) {
		const query = req.url.slice(req.path.length)
		const safepath = req.path.slice(0, -1).replace(/\/+/g, '/')
		res.redirect(301, safepath + query)
		return
	}
	next()
})
