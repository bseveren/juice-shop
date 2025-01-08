@autoinject
export class GoogleLoginService {

	private loggedInUsers: LoggedInUser[] = [];

	private scope: string[] = [
		'https://www.googleapis.com/auth/userinfo.profile',
		'https://www.googleapis.com/auth/userinfo.email',
		'https://www.googleapis.com/auth/drive.file'
	];

	private readonly scopes: readonly string[] = [
		'https://www.googleapis.com/foo1',
		'https://www.googleapis.com/foo2',
		'https://www.googleapis.com/foo3',
		'https://www.googleapis.com/foo4',
		'https://www.googleapis.com/foo5'
	];
	//=== SCOPES ===

	constructor(private localize: MainResources, private alertsService: AlertsService, private linkedMaterialConfig: LinkedMaterialConfigData, private appData: CommonAppData,
		bindingEngine: BindingEngine, private appService: AppService) {

		this._domain = this.resolveDomain();

		if (!this.enabled)
			return;
		
		bindingEngine.propertyObserver(linkedMaterialConfig, 'usersPrimaryGoogleEmail').subscribe((newValue: string, oldValue: string) => {
			if (oldValue) {
				let domain = oldValue.substring(oldValue.indexOf('@') + 1)
				this.reset(domain);
			}
		}); //never dispose

		let isStaff = this.appData['isStaff'];
		let featureToggling = this.appData['featureToggling'];
		if (isStaff && featureToggling && featureToggling['GoogleClassroom']) {
			this.scope.push(...this.scopes);
		}

		this.someScript();
		$.getScript('https://accounts.google.com/someScript');
	}

	get enabled(): boolean {
		return !!this.domain && !this.appService.isAppWebView;
	}

	private _domain: string;
	get domain() {
		return this._domain;
	}

	public userIsLoggedIn = (googleDomain?: string) => {
		let domain = googleDomain ? googleDomain : this.resolveDomain();

		if (_.some(this.loggedInUsers, x => x.domain === domain)) {
			return true;
		}
		return false;
	}

	public login = (callback: (oauthToken: string) => void, googleDomain?: string) => {
		let domain = this._domain = googleDomain ? googleDomain : this.resolveDomain();

		let user = _.find(this.loggedInUsers, x => x.domain === domain);
		if (user) {
			if (this.linkedMaterialConfig.multipleUserGoogleEmails) {
				let request: gapi.client.TokenObject = {
					access_token: user.oauthToken
				};
				gapi.client.setToken(request);
			}

			callback(user.oauthToken);
		}
		else {
			this.loginUser(domain, callback);
		}
	}

	private reset = (domain: string) => {
		let index = _.findIndex(this.loggedInUsers, (x) => x.domain === domain);
		if (index > -1) {
			this.loggedInUsers.splice(index, 1);
		}
	}

	private resolveDomain = () => {
		if (this.linkedMaterialConfig.usersPrimaryGoogleEmail) {
			return this.linkedMaterialConfig.usersPrimaryGoogleEmail.substring(
				this.linkedMaterialConfig.usersPrimaryGoogleEmail.indexOf('@') + 1);
		} else {
			return null;
		}
	}

	private loginUser = (domain: string, successCallback: (oauthToken: string) => void) => {
		let initParams: google.accounts.oauth2.TokenClientConfig = {
			client_id: AppConstants.googleAPI.OAuthClientID,
			scope: this.scope.join(' '),
			callback: (tokenResponse: google.accounts.oauth2.TokenResponse) => {
				this.onTokenResponse(tokenResponse, domain, successCallback);
			}
		}

		if (domain && !this.linkedMaterialConfig.multipleUserGoogleEmails) {
			initParams.hosted_domain = domain;
		}

		const client = google.accounts.oauth2.initTokenClient(initParams);
		client.requestAccessToken();
	}

	private onTokenResponse = (tokenResponse: google.accounts.oauth2.TokenResponse, domain: string, successCallback: (oauthToken: string) => void) => {
		if (!tokenResponse.hd || tokenResponse.hd !== domain) {
			this.alertInvalidDomain(domain);
			return;
		}

		let expiresMs = parseInt(tokenResponse.expires_in) * 1000;
		setTimeout(() => {
			this.reset(domain)
		}, expiresMs);

		this.loggedInUsers.push({
			domain: domain,
			oauthToken: tokenResponse.access_token,
		});

		this.alertsService.clearMessageBox();

		if (tokenResponse.error) {
			console.warn(`Google authorization init failed with code: ${tokenResponse.error}. Reason: ${tokenResponse.error_description}. See more: ${tokenResponse.error_uri}`);
			this.alertUnknowError();
			return;
		}

		successCallback(tokenResponse.access_token);
	}
