
import com.mongodb.BasicDBObject;
import org.apache.commons.lang.StringUtils;
import org.slf4j.Logger;

import javax.servlet.*;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;


public class AuthFilter implements Filter {

    public static final String IS_CONVERSION_EVENT_CHECKED = "isConversionEventChecked";
    private static Pattern excludeUrls;
    private static final Logger logger = LoggerFactory.make();
    private static AccountLock myLockInstance = AccountLock.getInstance();

    static String mainDomain = ".dashboard.bar.com";
    static String[] validProdSubDomains = {"eu1", "in1"};
    static String suffixStagingSubDomain = "-dashboard-staging-";
    private static String LOGIN_PATH = "/login.html";

    public void init(FilterConfig config) throws ServletException {
        String patternStr = config.getInitParameter("excludePattern");
        if (StringUtils.isNotEmpty(patternStr)) {
            excludeUrls = Pattern.compile(patternStr, Pattern.CASE_INSENSITIVE);
        }
    }

    public void destroy() {
    }

    static private boolean isValidHost(String host) {
        if (ApplicationProperties.isLocalDashboard()) {
            return true;
        }

        boolean hostEndsWithMainDomain = host.endsWith(mainDomain);

        if (hostEndsWithMainDomain) {

            String subDomain = host.substring(0, host.length() - mainDomain.length());

            for (String validProdSubDomain : validProdSubDomains) {
                if (subDomain.indexOf(validProdSubDomain) == 0) {
                    boolean isProdAccess = validProdSubDomain.length() + mainDomain.length() == host.length();
                    if (isProdAccess) {
                        return true;
                    }

                    boolean isStagingAccess = subDomain.startsWith(suffixStagingSubDomain, validProdSubDomain.length());

                    if (!isStagingAccess) {
                        return false;
                    }

                    int lenStagingSubDomainWithoutNumber = validProdSubDomain.length() + suffixStagingSubDomain.length();

                    if (lenStagingSubDomainWithoutNumber > host.length()) {
                        return false;
                    }

                    String stagingServerNumber = subDomain.substring(lenStagingSubDomainWithoutNumber);

                    return (StringUtils.isNumeric(stagingServerNumber));

                }
                ;
            }

        }

        return false;

    }

    public void doFilter(ServletRequest req, ServletResponse res,
                         FilterChain chain) throws ServletException, IOException {

        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;
        String hostName = request.getHeader("Host");

        request.setAttribute(Constants.KEY_STATIC_DOMAIN, "");

        if (hostName.contains("dashboard.foo.com")) {
            response.sendRedirect(new DatacenterRegion.AccountRegion(DatacenterRegion.instance.region(), 0)
                    + request.getRequestURI());
            return;
        }

        HttpSession session = request.getSession(true);
        User usr = null;
        String requestUri = request.getRequestURI();
        if (session != null) {
            usr = (User) session.getAttribute(Constants.SESSION_USER);
        }
        /* consume & clear it */
        Utils.consumeErrorOrMessage(request);
        /*
        *  redirect login.html to /<account_id>/my-board if user is already logged in for this session
        * */
        if (excludeFromFilter(request.getRequestURI()) ^ (usr != null && LOGIN_PATH.equals(requestUri))) {
            try {
                chain.doFilter(request, response);
                Utils.handleMessage(request, response);
            } catch (Throwable ex) {
                Utils.handleError(request, response, ex, null);
            }

        } else {
            /*
             * read X-Forwarded-Proto to redirect to https - This happens only
             * in production.
             */
            String proto = request.getHeader("X-Forwarded-Proto");
            if ("http".equals(proto)) {
                response.sendRedirect("https://" + request.getHeader("Host") + "/");
                return;

            }

            if (session != null) {
                if (usr != null && !AuthAction.isSafeEmail(usr.getLogin())) {
                    logger.warn("BLOCKED user {} from access; headers={}", usr.getLogin(),
                            AuthAction.extractHeaders(request));
                    Profiler.report("BLOCKED-user", 1);
                    response.setStatus(200);
                    return;
                }


                if (usr != null) {
                    String userLoginFromSession = usr.getLogin();
                    Cookie c = AuthUtil.getCookie(request, Constants.USER_SESSION_ID_COOKIE_NAME);
                    if (c != null) {
                        User userFromCookie = UserSessionID.decode(c.getValue());
                        if (userFromCookie != null) {

                            if (!userLoginFromSession.equals(userFromCookie.getLogin())) {
                                Profiler.report("BLOCKED-user", 1);
                                response.setStatus(401);
                                return;
                            }
                        }

                    }
                }

        		//boolean loggedInFromCrossRegionDemo = false;
                // Attempt a soft login using the login cookie
                if (usr == null && session.getAttribute(Constants.USER_SESSION_ID_LOGIN_ATTEMPTED) == null) {
                    // Don't attempt a session ID login further on in this
                    // session
                    session.setAttribute(Constants.USER_SESSION_ID_LOGIN_ATTEMPTED, new Object());
                    // Attempt a session resume using the user session ID
                    Cookie userSessionID = AuthUtil.getCookie(request,
                            Constants.USER_SESSION_ID_COOKIE_NAME);
                    if (userSessionID != null) {
                        String value = userSessionID.getValue();
                        usr = UserSessionID.decode(value);
                        if (usr != null) {
                            try {
                                usr = UsersDao.instance.reload(usr);
                            } catch (Exception e) {
                                // Ignore
                            }
                            if (usr != null) {
                                if (usr.isLogout()) {
                                    logger.info("UserSessionID on loggedout state. stolen cookie? Logged Out, User Details :"
                                            + usr.getLogin());
                                } else if (usr.getLastLoginTs() < usr.getLastLogoutTs()) {
                                    logger.info(
                                            "UserSessionID on recent logged out state. Stolen cookie? User login: [{}], Last_Login_Ts [{}], Last_Logout_Ts [{}]",
                                            usr.getLogin(), usr.getLastLoginTs(), usr.getLastLogoutTs());
                                    usr = null;
                                } else {
                                    logger.info("UserSessionID login performed for user " + usr.getLogin());
                                    try {
                                        AuthAction.onDone(usr.getLogin(), usr, request, response, true);
                                    } catch (Exception e) {
                                        e.printStackTrace();
                                        usr = null;
                                    }
                                }
                            }
                        }
                    }

                    {
                        String crossRegionDemoUserSessionID = request.getParameter(Constants.CROSS_REGION_DEMO_LOGIN_COOKIE_NAME);

                        logger.info("cross demo sessionID: " + crossRegionDemoUserSessionID);

                        if (StringUtils.isNotEmpty(crossRegionDemoUserSessionID)) {
                            String crossRegionDemo = crossRegionDemoUserSessionID;

                            User user = UserSessionID.decode(crossRegionDemo);
                            logger.info("cross demo decoded user: " + user);
                            usr = CrossRegionUsersDao.instance.getUser(user.getLogin());
                            logger.info("cross demo user from db: " + usr);
                            if (usr == null) {
                                CrossRegionUsersDao.instance.addUser(user);
                                usr = CrossRegionUsersDao.instance.getUser(user.getLogin());
                                logger.info("cross demo user from db again: " + usr);
                            }
                            try {
                                AuthAction.onDone(usr.getLogin(), usr, request, response, true);
                                session.setAttribute(Constants.SESSION_USER, usr);
                                usr.setCrossRegion(true);
                            } catch (Exception e) {
                                logger.info("cross demo user set to null, error:", e);
                                usr = null;
                            }
                        }
                    }
                }

                // If the user is still null, login via soft login cookie
                if (usr == null && session.getAttribute(Constants.SOFT_LOGIN_ATTEMPTED) == null) {
                    session.setAttribute(Constants.SOFT_LOGIN_ATTEMPTED,
                            new Object());
                    Cookie loginCookie = AuthUtil.getCookie(request,
                            Constants.SOFT_LOGIN_COOKIE_NAME);

                    if (loginCookie != null
                            && StringUtils.isNotBlank(loginCookie.getValue())) {

                        // We found the login cookie
                        LoginCookie lc = LoginCookie.decode(loginCookie
                                .getValue());
                        if (lc != null) {
                            usr = UsersDao.instance.authenticate(lc, true, 0);
                            // Disable for internal/root users
                            if (usr != null && usr.isInternal()) {
                                usr = null;
                            }

                            if (usr != null) {
                                if (usr.isLogout()) {
                                    logger.info("Soft login attempted on loggedout state. stolen cookie?");
                                    usr = null;
                                } else { // no need to check the last logged out ts, as lcs is completely cleared on a logout
                                    logger.info("Soft login performed for user " + usr.getLogin());
                                    // Send the new cookie - as it has been
                                    // changed
                                    try {
                                        AuthAction.onDone(usr.getLogin(), usr, request, response, true);
                                    } catch (Exception e) {
                                        logger.info("Soft login attempt failed", e);
                                        usr = null;
                                    }
                                }

                            }
                        }
                    }
                }

                if (usr != null && usr.isLogout() && !usr.isCrossRegion()) {
                    logger.info("Logged in on loggedout state. stolen cookie?");
                    usr = null;
                }
                if (usr != null && usr.getTrustLevel() == UsersDao.TrustLevel.Untrusted && !usr.isCrossRegion()) {
                    logger.warn("Untrusted user login: {}", usr.getLogin());
                    usr = null;
                }
                String url = request.getRequestURL().toString();
                if (usr != null) {
                    if (url.contains("staging")) {
                        if (!(AuthAction.emailsForStagingAccess.contains(usr.getLogin()) || usr.isInternal()
                                || usr.getLogin().contains("@bar.com"))) {
                            usr = null;
                        }
                    }
                    String ip = request.getRemoteHost();
                    String encodedAccountId = Utils.getAccountId(request);
                    if (encodedAccountId != null && !"x".equals(encodedAccountId)) {
                        String accountId;
                        try {
                            accountId = String.valueOf(AccountsUtil.decodeAccountId(encodedAccountId));
                        } catch (NumberFormatException e) {
                            //already decoded
                            accountId = encodedAccountId;
                        }
                        try {
                            AppConstants.ACCOUNT_ID.set(accountId);
                            AccountMeta accountMeta = AccountMetaDao.instance.getAccountMeta(accountId, true);
                            if (!usr.isInternal() && !accountMeta.isValidIpForDashboardAccess(ip)) {
                                logger.info("IP for user :" + usr.getLogin() + " is IP:" + ip);
                                usr = null;
                            }
                        } catch (Exception e) {
                            logger.error("Error while finding accountMeta ", e);
                            response.sendRedirect("/error.html");
                            return;
                        }
                    }
                }

                // TEST For BETA ACCESS
                if (usr != null && url.contains("beta")) {
                    if (!(usr.isInternal() || usr.getLogin().contains("@bar.com") || Environment.accountHasAccessToEnvironment(AppConstants.ACCOUNT_ID.get()))) {
                        usr = null;
                    }
                }

                try {
                    String incomingURI = request.getRequestURI();
                    String queryString = request.getQueryString();
                    String incomingURL = queryString == null ? incomingURI
                            : incomingURI + '?' + request.getQueryString();
                    if (usr == null) {
                        if (request.getRequestURI().contains("/json/")) { // deal with json requests
                            PrintWriter out = response.getWriter();
                            response.setContentType("application/x-javascript");
                            out.write("refreshPage();");
                            out.flush();
                            out.close();
                        } else { // deal with html requests
                            if ("GET".equals(request.getMethod())) {
                                // using uri instead of url - it's handy to
                                // redirect
                                // / to /<accountid>/my-board.html
                                session.setAttribute(Constants.INCOMING_URL,
                                        incomingURL);

                                if (StringUtils.isNotBlank(request.getParameter("from"))
                                        && request.getParameter("from").equals("shopify")
                                        && StringUtils.isNotBlank(request.getParameter("shop"))
                                        && StringUtils.isNotBlank(request.getParameter("hmac"))
                                        && StringUtils.isNotBlank(request.getParameter("signature"))
                                        && StringUtils.isNotBlank(request.getParameter("timestamp"))) {

                                    //user is logged out and is from shopify

                                    String shop = request.getParameter("shop");

                                    String accountId = ShopifyUtils.getShopAccountId(shop);

                                    if (accountId != null) {
                                        //could be connected
                                        AppConstants.ACCOUNT_ID.set(accountId);
                                        ShopifyOAuthManager oauth_manager = new ShopifyOAuthManager();
                                        if (oauth_manager.isOauthConnected()) {
                                            String redirectUrl = ShopifyUtils.getRedirectHost(request);
                                            String shopUrl = "https://" + oauth_manager.getShop();
                                            shopUrl += "/admin/oauth/authorize?";
                                            shopUrl += "client_id=" + ShopifyUtils.API_KEY
                                                    + "&scope=write_script_tags,read_themes,write_themes";
                                            shopUrl += "&redirect_uri=" + redirectUrl
                                                    + "/integrate-shopify.html?no_p=true";
                                            response.sendRedirect(shopUrl);
                                        }
                                    }
                                    response.sendRedirect("/shopify-login.html?shop=" + shop);
                                }
                            }
                            response.sendRedirect(LOGIN_PATH);
                        }
                        return;
                    } else {

                        boolean noAccounts = (usr.getAccounts() == null || usr
                                .getAccounts().size() == 0);
                        request.setAttribute("noAccounts", noAccounts);

                        boolean ajax = incomingURI.contains("/json");

                        if (incomingURI.startsWith("/create-account.html")
                                || incomingURI.startsWith("/json/create-account") || incomingURI.startsWith("/json/extendTrialPeriod.html")) {

                            // Pass through - hasn't created an account yet, or
                            // creating one now
                            String dataCenter = DatacenterRegion.instance.region().toString();
                            request.setAttribute("Data_Center", dataCenter);
                            setHeaders(response);
                            chain.doFilter(request, response);
                            return;

                        }
                        if (incomingURI.startsWith("/add-app.html")) {

                            // Pass through - hasn't created an account yet, or
                            // creating one now
                            setHeaders(response);
                            request.setAttribute("COUPON_CODE", usr.getCouponCode());
                            String dataCenter = DatacenterRegion.instance.region().toString();
                            request.setAttribute("Data_Center", dataCenter);
                            chain.doFilter(request, response);
                            return;

                        }

                        if (ajax && incomingURI.contains("audit-usage") && usr.isAuditor()) {
                            //user is auditor. should be able to access only usage
                            String encAccountId = Utils.getAccountId(request);
                            int accountId = AccountsUtil.decodeAccountId(encAccountId);
                            AppConstants.ACCOUNT_ID.set(accountId + "");
                            setHeaders(response);
                            chain.doFilter(request, response);
                            return;
                        }

                        int defaultAccountId = usr.getDefaultAccountId();

                        // fairy store on production, candy shop on local for root
                        if (ApplicationProperties.isLocalDashboard() && defaultAccountId == AppConstants.DEMO_ACCOUNT) {
                            defaultAccountId = 1200000000;
                        }

                        AppConstants.ACCOUNT_ID.set(defaultAccountId + "");
                        String defaultAccountIdEnc = AccountsUtil.encodeAccountId(defaultAccountId);

                        String encAccountId = Utils.getAccountId(request);
                        int acctId = -1;

                        if (usr != null && usr.isInternal()) {
                            try {
                                String decAccountId = encAccountId;
                                acctId = Integer.parseInt(decAccountId);
                                encAccountId = AccountsUtil.encodeAccountId(acctId);
                                response.sendRedirect(request.getRequestURI().replace(decAccountId, encAccountId));
                                return;
                            } catch (Exception e) {
                                // do nothing
                            }
                        }

                        if (StringUtils.isNotBlank(encAccountId)
                                && !"x".equals(encAccountId)) {

                            acctId = AccountsUtil.decodeAccountId(encAccountId);
                        }

                        boolean demoAccount = Utils.isDemoAccount(acctId);

                        if (usr != null && !request.getRequestURI().contains("/json/")) {
                            String _encodedAccount = "x".equals(encAccountId) ? null : encAccountId;
                            String _accountId =  _encodedAccount != null ? _encodedAccount : AccountsUtil.encodeAccountId(usr.getDefaultAccountId());
                            Environment.setCT2(request, usr, _accountId, response);
                        }

                        if (!demoAccount) {

                            if (usr.getAccounts() == null
                                    || usr.getAccounts().size() == 0) {
                                // allow redirect to demo account
                                if (!request.getRequestURI().contains("ZWW-WWW-WWWZ")) {
                                    response.sendRedirect("/create-account.html");
                                    return;
                                }

                            }
                            if ("/".equals(incomingURI) || LOGIN_PATH.equals(requestUri)) {
                                selectLandingPage(defaultAccountIdEnc, request, response);
                                return;
                            }

                            if (encAccountId.equals("x")) {/* wild account */
                                String encodedAccount = AccountsUtil.encodeAccountId(usr.getDefaultAccountId());
                                String redirect = incomingURI.replace("/x/", "/" + encodedAccount + "/");
                                String qString = request.getQueryString();
                                if (qString != null) {
                                    redirect += "?" + qString;
                                }
                                selectLandingPage(encodedAccount,
                                        redirect, request, response);
                                return;

                            }
                        }

                        String realAccountId = Integer.toString(acctId);

                        AppConstants.ACCOUNT_ID.set(realAccountId);

                        boolean demoAccess = AuthUtil.isDemoAccess(request, usr,
                                String.valueOf(realAccountId));

                        if (demoAccess) {
                            request.setAttribute("effectiveRole",
                                    UsersDao.Role.Admin.ordinal());
                        }

                        request.setAttribute("authSource", usr.getAuthSource()
                                .ordinal());
                        request.setAttribute("ACCOUNT_SINCE", realAccountId); // account
                        AccountMeta accountMeta = AccountMetaDao.instance.getAccountMeta(true);
                        if (accountMeta != null) {
                            boolean isGhost = accountMeta.isGhost();
                            request.setAttribute(Constants.IS_GHOST, isGhost);
                            if (isGhost && request.getRequestURI().endsWith("my-board.html")) {
                                response.sendRedirect("/" + encAccountId + "/aggregate/count.html");
                                return;
                            }
                            AccountMeta.CURRENT.set(AccountMetaDao.instance.getAccountMeta(true));

                            DateTime.setTZ(AccountMetaDao.instance.getAccountMeta().getTz());
                            if (accountMeta.getConvEvent() == null
                                    && usr.getConversionEventPerAccountForThisUser().get(acctId + "") == null) {
                                Object sessionConversionEventChecked = session
                                        .getAttribute(IS_CONVERSION_EVENT_CHECKED);
                                if (sessionConversionEventChecked == null) {
                                    AccountManager.setDefaultConversionEvent();
                                    session.setAttribute(IS_CONVERSION_EVENT_CHECKED, true);
                                }
                            }
                        } else if (!ApplicationProperties.isLocalDashboard()) {
                            //  check if account meta is null
                            AccountHelper.AccountCreationResult creationResult = AccountHelper
                                    .autoCorrectAccount(acctId);
                            if (!creationResult.successCreated) {
                                logger.error(creationResult.message);
                                logger.error("Failed to create account.Please try again");
                            }
                        }
                        BasicDBObject accountInfo = new BasicDBObject();
                        request.setAttribute(Constants.ACCOUNT_ID, encAccountId);
                        request.setAttribute(AbstractDao.ID, acctId);
                        accountInfo.put("accId", acctId);

                        if (accountMeta != null) {
                            accountInfo.put("tz", accountMeta.getTz());
                            accountInfo.put("plan", accountMeta.getAccountPlan().name());
                            final HashSet<String> stagingIPs = new HashSet<>();
                            stagingIPs.add("10.11.7.118");
                            stagingIPs.add("10.11.7.207");
                            stagingIPs.add("10.11.9.181");
                            stagingIPs.add("10.12.9.24");
                            stagingIPs.add("10.11.9.47");

                            //for testing on staging only
                            if (stagingIPs.contains(WzrkUtils.getMyIp())) {
                                if (acctId == 156) {
                                    //dream 11 new cluster
                                    accountInfo.put("evstore",
                                            Arrays.toString(new String[]{"111"}));
                                }
                            }

                            accountInfo.put("emailCaps",
                                    Utils.getModeFCapSetting(accountMeta.getGlobalFCapSetting(Email)));
                            accountInfo.put("pushCaps",
                                    Utils.getModeFCapSetting(accountMeta.getGlobalFCapSetting(Push)));
                            accountInfo.put("smsCaps", Utils.getModeFCapSetting(accountMeta.getGlobalFCapSetting(Sms)));
                            accountInfo.put("webPushCaps",
                                    Utils.getModeFCapSetting(accountMeta.getGlobalFCapSetting(Browser)));

                            accountInfo.put("webhookCaps",
                                    Utils.getModeFCapSetting(accountMeta.getGlobalFCapSetting(Webhook)));

                            accountInfo.put("webhooksSentFileEnabled", accountMeta.isEnableWebhookSentFile());


                            accountInfo.put("throttlePerMin", accountMeta.getPushNotifThrottleRatePer5Mins());
                            accountInfo.put("uninstallEnabled", accountMeta.isUninstallEnabled());
                            accountInfo.put("apnsProdMode", accountMeta.isApnsPushModeProduction());
                            accountInfo.put("androidIntegrated", WzrkUtils.isAndroidIntegrated(accountMeta));
                            accountInfo.put("iosIntegrated", WzrkUtils.isIosIntegrated(accountMeta));
                            accountInfo.put("isEmailIntegrated", WzrkUtils.isEmailIntegrated(accountMeta));
                            accountInfo.put("isSmsIntegrated", WzrkUtils.isSmsIntegrationDone(accountMeta));
                            accountInfo.put("isChromeIntegrated", WzrkUtils.isChromeIntegrated(accountMeta));

                            accountInfo.put("accPrivacySetting", accountMeta.getPrivacySetting());
                            if (usr != null) {
                                accountInfo.put("myPrivacySetting", Utils.getMyPrivacySetting(usr));
                                request.setAttribute("maskProfile", Utils.shouldMask(usr, profile));
                                request.setAttribute("maskEvent", Utils.shouldMask(usr, event));
                                request.setAttribute("maskDownload", Utils.shouldMask(usr, download));

                            }

                            if (accountMeta.getNagScreen() > 0) {
                                accountInfo.put("nagScreen", accountMeta.getNagScreen());
                            }
                            if (accountMeta.getAccessControl() != null) {
                                accountInfo.put("accessControl", accountMeta.getAccessControl());
                            }
                            if (accountMeta.getContainerLimitOrdinal() >= 0) {
                                accountInfo.put("containerLimitOrdinal", accountMeta.getContainerLimitOrdinal());
                                if (accountMeta.getContainerUsagePercentage() >= 0) {
                                    accountInfo.put("containerUsagePercentage", accountMeta.getContainerUsagePercentage());
                                }
                                if (accountMeta.getContainerLimitExceedTs() >= 0) {
                                    accountInfo.put("containerLimitExceedTs", accountMeta.getContainerLimitExceedTs());
                                }
                            }
                            if (accountMeta.getUsageThreshold() != -1) {
                                accountInfo.put("usagethreshold", accountMeta.getUsageThreshold());
                            }
                            accountInfo.put("superDevicePropsEnabled", accountMeta.isEnableSuperDeviceProperties());

                        }

                        String dataCenter = DatacenterRegion.instance.region().toString();
                        request.setAttribute("Data_Center", dataCenter);
                        request.setAttribute("Account_Info", accountInfo);
                        request.setAttribute("isLimitCheckRequired", ApplicationProperties.isLimitCheckRequired);

                        BasicDBObject billingInfo = BillingInfoDao.instance.findOne(new BasicDBObject(
                                        BillingInfoDao.ID, acctId),
                                new BasicDBObject(BillingInfoDao.NAG_ALERT, 1));
                        String nagAlert = "";
                        if (billingInfo != null) {
                            nagAlert = billingInfo.getString(BillingInfoDao.NAG_ALERT, "");
                        }
                        request.setAttribute("nagAlert", nagAlert);
                        if (accountMeta == null) {
                            request.setAttribute("webhooksSentFileEnabled", false);
                        } else {
                            request.setAttribute("webhooksSentFileEnabled", accountMeta.isEnableWebhookSentFile());
                        }

                        Account acct = AccountsDao.instance.getAccount(acctId, true);

                        AnalyticsSamplingConf asc = acct.getAnalyticsSamplingConf();
                        if (asc != null && asc.analyticsMaxPartitions != 20) {
                            request.setAttribute(AccountMetaDao.ANALYTICS_DRP, asc.analyticsDRPInDays);
                            request.setAttribute(AccountMetaDao.SAMPLING_MEM_PARTITIONS, asc.analyticsMaxPartitions);
                        }


                        // authorize now. if not admin
                        if (!usr.isRoot() && !demoAccount) {

                            Collection<Account> userAccounts = usr
                                    .getAccounts();

                            boolean found = false;
                            String accountName = "";

                            for (Account account : userAccounts) {
                                if (Integer.toString(account.getAccountId())
                                        .equals(realAccountId)) {
                                    accountName = account.getName();
                                    found = true;
                                    break;
                                }
                            }

                            if (!found && !usr.isFinanceOp()
                                    && !request.getRequestURI().contains("/billing-admin.html") &&
                                    !request.getRequestURI().contains("/billing-manager.html")
                                    && !request.getRequestURI().contains("//get-invoices") &&
                                    !request.getRequestURI().contains("/invoice.html")) {
                                //                                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                                logger.info("User: "
                                        + usr.getLogin()
                                        + " tried account access a forbidden account: "
                                        + encAccountId + "[" + realAccountId
                                        + "]");
                                //no-access page
                                if (usr.isInternal()) {
                                    response.sendRedirect("/" + defaultAccountIdEnc
                                            + "/account/internal/access.html?tempAccountId="
                                            + ((realAccountId != null) ? realAccountId : ""));
                                    return;
                                }
                                response.sendRedirect("/" + encAccountId + "/no-access-error.html");
                                return;
                            }

                            // to show the site name on the dashboard
                            request.setAttribute(Constants.ACCOUNT_NAME,
                                    accountName);
                            String biz = acct.getBiz();
                            Constants.BusinessType bt = Constants.BusinessType
                                    .valByName(biz);

                            if (bt != null) {
                                request.setAttribute(Constants.BIZ_TYPE,
                                        bt.displayName);
                            } else { // for older accounts without business
                                // type, classify as "Others"
                                request.setAttribute(
                                        Constants.BIZ_TYPE,
                                        Constants.BusinessType.others.displayName);
                            }
                        } else {
                            // admin account or fairy store
                            request.setAttribute(Constants.ACCOUNT_NAME,
                                    acct.getName());
                        }
                        request.setAttribute(Constants.USER_NAME, usr.getName());
                        request.setAttribute(Constants.USER_SAMPLING_MODE, getSamplingMode(usr).ordinal());
                        AccountMeta acctMeta = AccountMetaDao.instance
                                .getAccountMeta(true);
                        String accountTZ = acctMeta.getTz();
                        TimeZone tz = TimeZone.getTimeZone(accountTZ);
                        accountTZ = tz.getID();
                        request.setAttribute("timezone", accountTZ);

                        if (accountMeta.isMigrated) {
                            AccountManager.bootstrapAccountIfRequired(acctId,
                                    acct == null ? "Account :" + acctId : acct.getName());
                        }

                        int maxEvents = AccountMeta.CURRENT.get()
                                .getMaxEvents();
                        int maxProfile = AccountMeta.CURRENT.get()
                                .getMaxProfileProperties();
                        request.setAttribute("maxEvents", maxEvents);
                        request.setAttribute("maxProfileAttrs", maxProfile);

                        if (acctMeta.isMigrated && acctMeta.getLpTs() > 0) {
                            request.setAttribute("migrating", true);
                        }

                        int offsetSeconds = tz.getOffset(System
                                .currentTimeMillis()) / 1000;
                        int minutes = offsetSeconds / 60;
                        request.setAttribute("timezoneOffsetMinutes", minutes);

                        String serverStr = ApplicationProperties
                                .getProperty("MONGO.SERVERS");

                        if (!hostName.contains("dashboard.foo.com")
                                && !hostName
                                .contains("dashboard.bar.com")
                                && serverStr.startsWith("140.")) { //todo revisit this logic
                        } else {
                            request.setAttribute("PRODUCTION_WARNING", "");
                        }
                        if (demoAccount) {
                            request.setAttribute("isDemoAccount", true);
                        }
                        if (acct != null && acct.isTestAccount()) {
                            request.setAttribute("isTestAccount", true);
                            if (acct.getAccountId() >= PlanDetailsDao.NEW_TEST_ACCOUNT_DRP_TS) {
                                request.setAttribute("isNewPricingTestAccount", true);
                            }
                        }
                        if (usr != null && realAccountId != null) {
                            request.setAttribute("functionalRole",
                                    usr.getFunctionalRole(realAccountId));
                        }

                        if (usr != null && !usr.isInternal() && usr.getGhostAccountIds() != null) {
                            request.setAttribute(Constants.GHOST_ENABLED,
                                    usr.getGhostAccountIds().size() > 0);
                        }

                        if (usr != null) {
                            if (usr.getLastNotifiedTimeStamp() < ApplicationProperties.getNotificationUpdateTimestamp()) {
                                request.setAttribute("showNotification", true);
                            } else {
                                request.setAttribute("showNotification", false);
                            }
                        }

                        AppleCertificateRegistry.updateAccountStatus(request);

                        setHeaders(response);
                        stickApproxIIDIntoSession(session);
                        CustomDashboardAction.attachBoards(request, usr, acctId + "");

                        AuthUtil.setUserSessionIDCookie(request, response,
                                UserSessionID.encode(usr), usr.getLastLogoutTs());

                        String requestDashboardURL = request.getScheme() + "://" + request.getServerName();

                        if (!ApplicationProperties.isLocalDashboard()
                                && !requestDashboardURL.contains("dashboard-branch")
                                && !requestDashboardURL.contains("staging")
                                && !requestDashboardURL.contains("beta")
                                && !requestDashboardURL.startsWith(acct.accountRegion.dashboardRootURL)) {
                            response.sendRedirect(acct.accountRegion.dashboardRootURL + request.getRequestURI()
                                    + (request.getQueryString() != null ? "?" + request.getQueryString() : ""));
                            return;
                        }

                        // Track login
                        trackLogin(usr, realAccountId, session, request, demoAccount, ajax);

                        if (!request.getRequestURI().contains("/json/") && usr != null) {
                            Environment.setFlagsCookie(realAccountId, usr, request, response);
                        }

                        chain.doFilter(request, response);
                    }

                    Utils.handleMessage(request, response);
                } catch (Throwable t) {
                    Utils.handleError(request, response, t, usr);
                } finally {
                    AppConstants.ACCOUNT_ID.remove();
                }
            }
        }
    }

    public User.SamplingMode getSamplingMode(User user) {
        String accountId = AppConstants.ACCOUNT_ID.get();
        User.SamplingMode defaultSamplingMode = User.SamplingMode.on;
        Map<String, User.SamplingMode> samplingModePerAccountForThisUser = null;
        if (user != null) {
            samplingModePerAccountForThisUser = user.getSamplingModePerAccountForThisUser();
        }
        if (samplingModePerAccountForThisUser != null) {
            return samplingModePerAccountForThisUser.getOrDefault(accountId, defaultSamplingMode);
        } else {
            return defaultSamplingMode;
        }
    }

    private void selectLandingPage(String defaultAccountIdEnc, HttpServletRequest request,
                                   HttpServletResponse response) throws IOException {
        selectLandingPage(defaultAccountIdEnc, null, request, response);
    }

    private void selectLandingPage(String defaultAccountIdEnc,
                                   String redirectUrl, HttpServletRequest request, HttpServletResponse response)
            throws IOException {

        if (redirectUrl != null) {
            response.sendRedirect(redirectUrl);
            return;
        }
        response.sendRedirect(Environment.generateHomeRoute(defaultAccountIdEnc, request));
    }

    private void setHeaders(HttpServletResponse response) {
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Cache-Control",
                "no-cache, no-store, must-revalidate"); // HTTP
        // 1.1.
        response.setHeader("Pragma", "no-cache"); // HTTP 1.0.
        response.setDateHeader("Expires", 0); // Proxies.
    }

    public static boolean excludeFromFilter(String path) {
        return ((excludeUrls != null) && excludeUrls.matcher(path).find())
                || isActivationURL(path) || isChargebeeCallback(path);
    }

    private static boolean isActivationURL(String path) {

        String[] parts = path.split("/");

        return (parts.length == 4 && "activation".equals(parts[2]))
                || (parts.length == 3 && "activation".equals(parts[1]));
    }

    private static boolean isChargebeeCallback(String path) {
        return path.contains("chargebeecb");
    }

    private static final String METRIC_LAST_VISITED_ACCOUNT = "METRIC_LAST_VISITED_ACCOUNT";
    private static final String TRACKED_ACCOUNTS_LOGIN = "TRACKED_ACCOUNTS_LOGIN";
    private static final HashMap<String, Integer> duplicateUserLoginMapCheck = new HashMap<>();

    static {
        TaskScheduler.scheduleTask(new Runnable() {
            @Override
            public void run() {
                synchronized (duplicateUserLoginMapCheck) {
                    final int now = (int) (System.currentTimeMillis() / 1000);
                    Iterator<Map.Entry<String, Integer>> iterator = duplicateUserLoginMapCheck.entrySet().iterator();
                    while (iterator.hasNext()) {
                        Map.Entry<String, Integer> next = iterator.next();
                        if (now - next.getValue() > 60 * 20) { // older than twenty minutes
                            iterator.remove();
                        }
                    }
                }
            }
        }, 10, TimeUnit.MINUTES, "duplicate-user-login-map-cleaner");
    }

    private static synchronized void trackLogin(User user, String realAccountId,
                                                HttpSession session, HttpServletRequest request, boolean isDemoAccount, boolean ajax) {

        if (user == null || realAccountId == null || session == null || ajax)
            return;

        final String lastAccountVisited = (String) session.getAttribute(METRIC_LAST_VISITED_ACCOUNT);
        // Fresh session?
        final boolean freshSession = lastAccountVisited == null;
        final boolean shouldRecord;

        // Fresh session or Existing session, and account changed, track login
        if (freshSession || !lastAccountVisited.equals(realAccountId)) {

            stickApproxIIDIntoSession(session, true);

            session.setAttribute(METRIC_LAST_VISITED_ACCOUNT, realAccountId);
            session.setAttribute(Constants.IS_DATA_COMING, false);

            shouldRecord = true;

            if (!isDemoAccount) {
                request.setAttribute(Constants.FIRST_ACCOUNT_PAGE, true);
                int defaultAccount = Integer.parseInt(realAccountId);
                try {
                    UsersDao.instance.updateLastAccount(user.getLogin(), defaultAccount);
                    user.setDefaultAccountId(defaultAccount);
                } catch (Throwable t) {
                    if (!ApplicationProperties.isLocalDashboard()) {
                        logger.error(t.getMessage(), t);
                    }
                }
            }

        } else {
            shouldRecord = false;
        }

        if (shouldRecord) {
            // There's a duplicate check here due to concurrent requests. Hence, multiple logins
            // within 5 seconds are not considered
            synchronized (duplicateUserLoginMapCheck) {
                Integer lastLoginTS = duplicateUserLoginMapCheck.get(user.getLogin() + realAccountId);
                if (lastLoginTS == null) {
                    lastLoginTS = 0;
                }

                int now = (int) (System.currentTimeMillis() / 1000);

                // Always update the map
                duplicateUserLoginMapCheck.put(user.getLogin() + realAccountId, now);

                if (now - lastLoginTS < 60 * 15) {
                    return;
                }
            }

            // Note: Account ID is already set to real account ID, so it will be added automatically
            MetricsHelper.instance.recordEventWithFeatureUsed("Logged In", new BasicDBObject("User Email", user.getLogin())
                    .append("User Name", user.getName()));
        }

        Set<String> accountsLoginTrack = (Set<String>) session.getAttribute(TRACKED_ACCOUNTS_LOGIN);

        if (accountsLoginTrack == null
                || !accountsLoginTrack.contains(AppConstants.ACCOUNT_ID.get() + DateTime.getYMD())) {
            try {
                myLockInstance.getLock(AppConstants.ACCOUNT_ID.get()).lock();
                if (accountsLoginTrack == null
                        || !accountsLoginTrack.contains(AppConstants.ACCOUNT_ID.get() + DateTime.getYMD())) {

                    PricingHelper.instance.markAll(AppConstants.ACCOUNT_ID.get(), ProfileReach.Device.Web,
                            PricingDao.Bucket.login_count, 1);
                    if (accountsLoginTrack == null) {
                        accountsLoginTrack = new HashSet<>();
                    }
                    accountsLoginTrack.add(AppConstants.ACCOUNT_ID.get() + DateTime.getYMD());
                    session.setAttribute(TRACKED_ACCOUNTS_LOGIN, accountsLoginTrack);
                }
            } finally {
                myLockInstance.getLock(AppConstants.ACCOUNT_ID.get()).unlock();
            }
        }
    }

    public static int stickApproxIIDIntoSession(HttpSession session) {
        return stickApproxIIDIntoSession(session, false);
    }

    public static int stickApproxIIDIntoSession(HttpSession session, boolean force) {
        // Stick the IID count into the session, if not set
        Object iidApprox = session.getAttribute(Constants.IID_APPROX_FROM_SEQUENCE_DAO);
        if (iidApprox == null || force) {
            iidApprox = SequenceGenerator.instance.getApproximateIIDCount() + "";
            session.setAttribute(Constants.IID_APPROX_FROM_SEQUENCE_DAO, iidApprox);
        }

        return Integer.parseInt(iidApprox.toString());
    }

    public static void main(String[] args) {
        String[] hosts =
                {
                        "eu1.dashboard.bar.com",
                        "evil.com",

                };

        for (String host : hosts) {
            System.out.println("host: " + host + " " + isValidHost(host));
        }

    }

}
