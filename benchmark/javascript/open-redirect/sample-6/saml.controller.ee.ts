@RestController('/sso/saml')
export class SamlController {
	constructor(
		private readonly authService: AuthService,
		private readonly samlService: SamlService,
		private readonly urlService: UrlService,
		private readonly eventService: EventService,
	) {}

	@Get('/metadata', { skipAuth: true })
	async getServiceProviderMetadata(_: express.Request, res: express.Response) {
		return res
			.header('Content-Type', 'text/xml')
			.send(this.samlService.getServiceProviderInstance().getMetadata());
	}

	/**
	 * Return SAML config
	 */
	@Get('/config', { middlewares: [samlLicensedMiddleware] })
	async configGet() {
		const prefs = this.samlService.samlPreferences;
		return {
			...prefs,
			entityID: getServiceProviderEntityId(),
			returnUrl: getServiceProviderReturnUrl(),
		};
	}

	/**
	 * Set SAML config
	 */
	@Post('/config', { middlewares: [samlLicensedMiddleware] })
	@GlobalScope('saml:manage')
	async configPost(req: SamlConfiguration.Update) {
		const validationResult = await validate(req.body);
		if (validationResult.length === 0) {
			const result = await this.samlService.setSamlPreferences(req.body);
			return result;
		} else {
			throw new BadRequestError(
				'Body is not a valid SamlPreferences object: ' +
					validationResult.map((e) => e.toString()).join(','),
			);
		}
	}

	/**
	 * Toggle SAML status
	 */
	@Post('/config/toggle', { middlewares: [samlLicensedMiddleware] })
	@GlobalScope('saml:manage')
	async toggleEnabledPost(req: SamlConfiguration.Toggle, res: express.Response) {
		if (req.body.loginEnabled === undefined) {
			throw new BadRequestError('Body should contain a boolean "loginEnabled" property');
		}
		await this.samlService.setSamlPreferences({ loginEnabled: req.body.loginEnabled });
		return res.sendStatus(200);
	}

	/**
	 * Assertion Consumer Service endpoint
	 */
	@Get('/acs', { middlewares: [samlLicensedMiddleware], skipAuth: true, usesTemplates: true })
	async acsGet(req: SamlConfiguration.AcsRequest, res: express.Response) {
		return await this.acsHandler(req, res, 'redirect');
	}

	/**
	 * Assertion Consumer Service endpoint
	 */
	@Post('/acs', { middlewares: [samlLicensedMiddleware], skipAuth: true, usesTemplates: true })
	async acsPost(req: SamlConfiguration.AcsRequest, res: express.Response) {
		return await this.acsHandler(req, res, 'post');
	}

	/**
	 * Handles the ACS endpoint for both GET and POST requests
	 * Available if SAML is licensed, even if not enabled to run connection tests
	 * For test connections, returns status 202 if SAML is not enabled
	 */
	private async acsHandler(
		req: SamlConfiguration.AcsRequest,
		res: express.Response,
		binding: SamlLoginBinding,
	) {
		try {
			const loginResult = await this.samlService.handleSamlLogin(req, binding);
			// if RelayState is set to the test connection Url, this is a test connection
			if (isConnectionTestRequest(req)) {
				if (loginResult.authenticatedUser) {
					return res.render('saml-connection-test-success', loginResult.attributes);
				} else {
					return res.render('saml-connection-test-failed', {
						message: '',
						attributes: loginResult.attributes,
					});
				}
			}
			if (loginResult.authenticatedUser) {
				this.eventService.emit('user-logged-in', {
					user: loginResult.authenticatedUser,
					authenticationMethod: 'saml',
				});

				// Only sign in user if SAML is enabled, otherwise treat as test connection
				if (isSamlLicensedAndEnabled()) {
					this.authService.issueCookie(res, loginResult.authenticatedUser, req.browserId);
					if (loginResult.onboardingRequired) {
						return res.redirect(this.urlService.getInstanceBaseUrl() + '/saml/onboarding');
					} else {
						const redirectUrl = req.body?.RelayState ?? '/';
						return res.redirect(this.urlService.getInstanceBaseUrl() + redirectUrl);
					}
				} else {
					return res.status(202).send(loginResult.attributes);
				}
			}
			this.eventService.emit('user-login-failed', {
				userEmail: loginResult.attributes.email ?? 'unknown',
				authenticationMethod: 'saml',
			});
			// Need to manually send the error response since we're using templates
			return sendErrorResponse(res, new AuthError('SAML Authentication failed'));
		} catch (error) {
			if (isConnectionTestRequest(req)) {
				return res.render('saml-connection-test-failed', { message: (error as Error).message });
			}
			this.eventService.emit('user-login-failed', {
				userEmail: 'unknown',
				authenticationMethod: 'saml',
			});
			// Need to manually send the error response since we're using templates
			return sendErrorResponse(
				res,
				new AuthError('SAML Authentication failed: ' + (error as Error).message),
			);
		}
	}
