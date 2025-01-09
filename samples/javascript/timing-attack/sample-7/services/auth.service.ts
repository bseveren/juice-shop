export default class AuthService {
    /**
     * A simple middleware that asserts valid access tokens and sends 401 responses
     * if the token is not present or fails validation.  If the token is valid its
     * contents are attached to req.jwt
     *
     * @param req
     * @param res
     * @param next
     * @returns {*}
     */
    authenticationRequired(req, res, next) {

        // Environment checker
        const hooksCheck = (req.originalUrl.includes('hooks')); // Check if in the url we have the path "hooks"

        // Don't check the authentication if one of this check is true
        if (isLocalEnv || hooksCheck) {
            // To know if the user of the API is external to ***
            process.env.isClientLimited = String(false);

            // Client for local
            process.env.currentClient = process.env.testRunning ? appConfig.defaultTestUser : appConfig.defaultUser;

            // To know if it's an external (out of ***) client
            process.env.isExternalClient = String(false);

            return next();
        }

        // Check if we have authorization header
        const authHeader = req.get('authorization'),
            headerCheck = authHeader ? (!!authHeader.match(/Bearer (.+)/)) : false;

        // If we don't have the good authorization header we return en 401 error
        if (!headerCheck) {
            return res.status(401).end();
        }

        const token = authHeader.match(/Bearer (.+)/)[1];

        // Check if the API call the API
        if (token === process.env.onboardingApiKey) {
            // To know if the user of the API is external to ***
            process.env.isClientLimited = String(false);

            // Client for local
            process.env.currentClient = appConfig.defaultUser;

            // To know if it's an external (out of ***) client
            process.env.isExternalClient = String(false);

            return next();
        }

        // Check auth process
        return googleClient.verifyIdToken({idToken: token, audience: process.env.googleClientId})
            .then((data: LoginTicket) => {
                const payload = data.getPayload(),
                hasPayloadEmail = payload && payload.email;

                // If no payload from Google, reject the access
                if (!hasPayloadEmail) {
                    return res.status(403).json({message: 'Resource not allowed'});
                }

                return this.checkRolePermissions(payload.email, req)
                    .then(() => {
                        // Take the email of the current user to know who update a model
                        process.env.currentClient = payload.email;

                        // To know if the user of the API is external to ***
                        process.env.isClientLimited = String(false);

                        // To know if it's an external (out of ***) client
                        process.env.isExternalClient = String(false);

                        return next();
                    })
                    .catch((error) => {
                        if (error instanceof Sequelize.EmptyResultError) {
                            return res.status(403).json({message: 'Resource not allowed'});
                        }
                        return next(error);
                    });
            })
            .catch(() => {
                // Check if a specific consumer can use the API if Google auth is not allowed
                return this.authConsumerCheck(token, req)
                    .then(() => next())
                    .catch(error => {
                        if (error instanceof Sequelize.EmptyResultError) {
                            return res.status(403).json({message: 'Resource not allowed'});
                        }
                        return next(error);
                    });
            });
    }

    /**
