module.exports = (server: Express) => {
    const endpoint = '';

    // First Party routes
    server.get(config.firstPartyRoutes.client);
    server.all(`${config.firstPartyRoutes.xhr}/*`);
    server.all(`${config.firstPartyRoutes.captcha}/*`);

    server.use(passport.initialize({ userProperty: 'userContext' }));
    server.use(passport.session());

    // xhr - login using username & password
    router.post(
        '/portal/auth',
        authenticationMiddleware.validateUsernameAndPassword,
        strategy.usernamePasswordStrategy,
        authenticationMiddleware.initiateLastActivity,
        produceAuditMiddleware(AuditAction.LOGIN, AuthType.EMAIL_PASSWORD),
        (req: AuthenticatedRequest, res: Response) => {
            console.warn(`Email/Password successful login flow for user ${req.userContext.userinfo.email}`);
            metrics.sendAuthenticationSuccess('login', 'user_password');
            req.session.loggedInWithPassword = true;
            res.send({ content: baseUrl });
        },
    );

    router.post(
        '/portal/verify',
        strategy.mfaStrategy,
        authenticationMiddleware.initiateLastActivity,
        produceAuditMiddleware(AuditAction.LOGIN, AuthType.EMAIL_PASSWORD),
        (req: AuthenticatedRequest, res: Response) => {
            console.warn(`MFA successful login flow for user ${req.userContext.userinfo.email}`);
            metrics.sendAuthenticationSuccess('login', 'user_password');
            req.session.loggedInWithPassword = true;
            res.send({ content: baseUrl });
        },
    );

    // ssr - redirect to Idp
    router.get(config.routes.ssoLogin, authenticationMiddleware.validateAndSetEmail, strategy.ssoStrategy);

    // ssr - redirect to google
    router.get('/login/google', strategy.googleStrategy);

    // ssr - callback from Idp (saml)
    router.post(
        config.routes.ssoCallback,
        strategy.ssoStrategy,
        authenticationMiddleware.initiateLastActivity,
        produceAuditMiddleware(AuditAction.LOGIN, AuthType.SAML),
        (req: AuthenticatedRequest, res: Response) => {
            console.warn(`SAML (or legacy OIDC) successful login flow for user ${req.userContext.userinfo.email}`);
            metrics.sendAuthenticationSuccess('login', 'sso');
            res.redirect(baseUrl);
        },
    );

    // ssr - callback from Idp (oidc)
    router.get(
        config.routes.ssoCallback,
        strategy.ssoStrategy,
        authenticationMiddleware.initiateLastActivity,
        produceAuditMiddleware(AuditAction.LOGIN, AuthType.SAML),
        (req: AuthenticatedRequest, res: Response) => {
            console.warn(`OIDC successful login flow for user ${req.userContext.userinfo.email}`);
            metrics.sendAuthenticationSuccess('login', 'sso');
            res.redirect(baseUrl);
        },
    );

    // ssr - callback from Idp (google)
    router.get(
        config.routes.googleCallback,
        strategy.googleStrategy,
        authenticationMiddleware.initiateLastActivity,
        produceAuditMiddleware(AuditAction.LOGIN, AuthType.GOOGLE),
        (req: AuthenticatedRequest, res: Response) => {
            console.warn(`Google successful login flow for user ${req.userContext.userinfo.email}`);
            metrics.sendAuthenticationSuccess('login', 'google');
            res.redirect(baseUrl);
        },
    );

    // xhr - get auth type by token
    router.get('/portal/token/register', authenticationController.decryptRegistrationToken);

    // xhr - register user using password
    router.post('/portal/register', authenticationController.registerEmailPasswordUser);

    // xhr - forgot password
    router.post('/portal/forgot', authenticationController.forgotPassword);

    // xhr - get auth type by token
    router.get('/portal/token/change', authenticationController.checkUpdatePasswordToken);
    router.post('/portal/change', authenticationController.updatePassword);

    router.get(
        '/user/logout',
        produceAuditMiddleware(AuditAction.LOGOUT),

    server.use((err: unknown, req: UnauthenticatedRequest, res: Response, next: NextFunction) => {
        const redirectToExternalPortal = req.redirectToExternalPortal;

        // unable to login but user is able to login to external portal
        if (redirectToExternalPortal) {
            produceAudit({
                user: req.email,
                action: AuditAction.LOGIN,
                status: ActionStatus.SUCCESS,
                auth_type: AuthType.EXTERNAL,
            });
            req.redirectToExternalPortal = null;
            res.send({ content: redirectToExternalPortal });
            console.warn(`User ${req.email} redirected to external portal`);
            metrics.sendAuthenticationSuccess('login', 'external');
            return;
        }

        if (err instanceof AuthenticationError) {
            // most likely trying to get /login page in the browser and not from OIDC flow
            if (req.url === '/login' && req.method === 'GET' && !req.query.state) {
                return res.redirect(`${config.loginUrl}/user/login`);
            }

            console.error(err.toString());
            const { flow, type, user } = err.getError();
            metrics.sendAuthenticationError(flow, type, err.message);
            produceAudit({
                user,
                action: AuditAction.LOGIN,
                status: ActionStatus.FAILURE,
                error_reason: err.message,
                auth_type: type,
            });

            // all routes with /portal are xhr request
            if (!req.url.startsWith('/portal')) {
                return res
                    .status(401)
                    .redirect(`${config.loginUrl}/user/login?error=${err.getCustomerFacingError() || ''}`);
            }
            return res.status(500).send({ content: err.getCustomerFacingError() || 'Authentication Error' });
        }

        if (err instanceof MFARequiredError) {
            produceAudit({
                user: req.email,
                action: AuditAction.LOGIN,
                status: ActionStatus.CHALLENGE,
                auth_type: AuthType.EMAIL_PASSWORD,
            });
            return res.status(302).send({ content: 'MFA required', stateToken: err.stateToken });
        }

        produceAudit({
            user: req.email,
            action: AuditAction.LOGIN,
            status: ActionStatus.FAILURE,
            error_reason: err.toString(),
            auth_type: AuthType.UNKNOWN,
        });
        console.error(err);
        return res.redirect(`${config.loginUrl}/user/login?error`);
    });
