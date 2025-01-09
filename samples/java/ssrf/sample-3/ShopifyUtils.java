package com.foo.dashboard.utils.plugins.shopify;


import com.chargebee.org.json.JSONException;
import com.chargebee.org.json.JSONObject;
import com.mongodb.BasicDBObject;
import java.io.IOException;
import javax.servlet.http.HttpServletRequest;
import org.apache.commons.lang.StringUtils;

/**
 */
public class ShopifyUtils {


    private static final String STATUS = "status";
    private static final String IS_ONLY_WEBHOOK_INTEGRATION = "onlyWebhookIntegration";
    private static final CTLogger logger =
            new CTLogger(ShopifyUtils.class, CTLogger.Feature.SHOPIFY_PLUGIN);


    public enum ShopifyVersion {
        V1(INTEGRATION_JS_URL, INTEGRATION_ASSET_URL, THEME_INCLUDE),
        V2(INTEGRATION_JS_URL_V2, INTEGRATION_ASSET_URL_V2, THEME_INCLUDE_V2);

        private String integrationJsUrl;
        private String integrationAssetUrl;
        private String themeInclude;

        ShopifyVersion(String integrationJsUrl, String integrationAssetUrl, String themeInclude) {
            this.integrationJsUrl = integrationJsUrl;
            this.integrationAssetUrl = integrationAssetUrl;
            this.themeInclude = themeInclude;
        }


        public String getIntegrationJsUrl() {
            return integrationJsUrl;
        }

        public String getIntegrationAssetUrl() {
            return integrationAssetUrl;
        }

        public String getThemeInclude() {
            return themeInclude;
        }
    }


	public static void putConnectionTypeInRequest(HttpServletRequest request) throws Exception {
        int accountId = Integer.parseInt(AppConstants.ACCOUNT_ID.get());
        ShopifyVersion version =
                isShopifyV1Account(accountId) ? ShopifyVersion.V1 : ShopifyVersion.V2;
        ShopifyOAuthManager authManager = new ShopifyOAuthManager();
        request.setAttribute("isOldPluginUser", isShopifyV1Account(accountId));
        request.setAttribute("endPoint",
                authManager.getWebhookEndPoint(ApiType.MANUAL_INTEGRATION));
        putConnectionStatusInRequest(request, authManager, version, accountId);
    }

    public static void putConnectionStatusInRequest(HttpServletRequest request,
            ShopifyOAuthManager authManager, ShopifyVersion version, int accountId)
            throws JSONException {
        try {
            boolean isOnlyWebhookIntegration =
                    AccountMetaDao.instance.getOnlyWebhookFlagFromShopifyData(accountId);
            request.setAttribute(IS_ONLY_WEBHOOK_INTEGRATION, isOnlyWebhookIntegration);
            request.setAttribute(WEBPUSH_INTEGRATION,
                    AccountMetaDao.instance.getWebPushFlagFromShopifyData(accountId));
            request.setAttribute(SHOP_CONNECTED_TS,
                    AccountMetaDao.instance.getShopifyConnectionTimeStamp(accountId));
            if (authManager.isConnected()) {
                request.setAttribute(VERSION, 2);
                request.setAttribute("shop",
                        authManager.shop.substring(0, authManager.shop.indexOf('.')));
                if ((authManager.isAssetIntegrated(version)
                        && checkScriptIntegration(authManager, request, version))
                        || isOnlyWebhookIntegration) {
                    request.setAttribute(STATUS, "connected");
                } else {
                    request.setAttribute(STATUS, "update");
                }
            } else {
                request.setAttribute(STATUS, "disconnected");
                getShopifyStoreStatus(accountId, request);
            }

        } catch (IOException e) {
            request.setAttribute(STATUS, "reinstall");
        }
    }





}
