package com.foo.dashboard.action.account;



import com.chargebee.org.json.JSONObject;
import com.mongodb.BasicDBList;
import com.mongodb.BasicDBObject;
import java.io.IOException;
import java.util.concurrent.CompletableFuture;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import org.apache.commons.lang.StringUtils;
import org.apache.struts.action.ActionForm;
import org.apache.struts.action.ActionForward;
import org.apache.struts.action.ActionMapping;



public class ShopifySettingsAction extends BaseAction {

    private static final String INTEGRATE = "integrate";
    protected static final String SUCCESS = "success";
    protected static final int FLAG_EXPIRY_TIME = 900; // 15 min expiry for integrate/disintegrate
                                                       // shopify flag

    @AccessFilterValue(role = Constants.AccessRole.CREATOR)
    public ActionForward integrateShopify(ActionMapping mapping, ActionForm form,
            HttpServletRequest request, HttpServletResponse response) throws Exception {
        String shopName = request.getParameter("shop");
        User usr = getUser(request);
        logger.info("integrating shopify. shop {}, user: {}", shopName, usr.getLogin());
        ShopifyOAuthManager authManager = getShopifyOauthManager(shopName, request);

        String accessToken = authManager.responseAccessToken();
        request.setAttribute("accessToken", accessToken);

        String newApp = request.getParameter("newApp");

        int accountId =
                getShopAccountIdAssociatedWithConnectionFlag(INTEGRATE_SHOPIFY_FLAG, shopName);

        if (accountId == -1) {
            Slack.slack(
                    "Unable to integrate shopify as no flag present. shopName: " + shopName
                            + " user: " + usr.getLogin(),
                    Slack.SlackChannel.DASHBOARD_ALERTS, false, false);
            logger.info("Account not found for integrate. shop: {}, user: {}", shopName,
                    usr.getLogin());

            return null;
        }

        logger.info("got account: {}", accountId);

        if (newApp != null) {
            // create the account for the logged in user and integrate shopify
            HttpSession session = request.getSession();
            User user = (User) session.getAttribute(Constants.SESSION_USER);

            JSONObject shopData = authManager.getShopDetails();
            String hasApp = "http://" + shopData.getString("domain");
            String tzId = shopData.getString("iana_timezone");

            // Account name has to be unique. get it from the myshopify domain
            String accountName = shopData.getString("myshopify_domain");
            String nob = "ecomm";
            String appRole = "both";
            AppInfo appInfo = new AppInfo();
            appInfo.setWebURL(hasApp);

            // create the account
            AccountHelper.AccountCreationResult acr = handleCreateRequest(accountName, tzId, nob,
                    hasApp, user, appInfo, appRole, request, "");
            AppConstants.ACCOUNT_ID.set(acr.accountID);
            accountId = Integer.parseInt(acr.accountID);
        }
        try {
            authManager.saveAccessToken(accountId);
            if (subscribeAndSaveWebhook(authManager, usr, accountId, request, response)) {
                ShopifyUtils.integrate(authManager, accountId);
                // adding only webhook flag to shpfy data object from connection flag object
                AccountMetaDao.instance.saveShopifyConnectionFlagsInShopifyData(accountId);
                CompletableFuture.runAsync(() -> updateShopifyAppStatus(shopName,
                        ShopStatus.CONNECTED,
                        authManager));
                if (!usr.getAccount(accountId).isTestAccount()) {
                    ChangeHelper.instance.recordChangeAndNotifyASync(
                            ChangeHelper.Change.SHOPIFY_CONNECTED,
                            new BasicDBObject("action", "connected"), usr, true);
                }
            }
        } catch (IOException e) {
            logger.error("Shopify IOError. accountId: {}, shop: {}, user: {}", accountId, shopName,
                    usr.getLogin(), e);
        } catch (Exception e) {
            logger.error("Shopify Error. accountId: {}, shop: {}, user: {}", accountId, shopName,
                    usr.getLogin(), e);
        } finally {
            AccountMetaDao.removeShopifyConnectionFlags(accountId);
        }

        String fromPickList = request.getParameter("fromPick");

        if (fromPickList != null || newApp != null) {
            request.setAttribute("redirectUrl", ShopifyUtils.getRedirectHost(request) + "/"
                    + AccountsUtil.encodeAccountId(accountId) + "/my-board.html");
        }


        logger.info("Integrated shopify for account: {}, user: {}, shopName: {}", accountId,
                usr.getLogin(), shopName);
        return mapping.findForward("integrate-shopify");
    }


}
