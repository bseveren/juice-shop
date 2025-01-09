package com.foo.dashboard.utils.plugins.shopify;

import static com.google.api.client.http.HttpStatusCodes.*;
import static com.foo.dashboard.Environment.isShopifyV1Account;
import static com.foo.db.AbstractDao.ID;
import static com.foo.db.AbstractDao.STATUS;

import com.chargebee.org.json.JSONArray;
import com.chargebee.org.json.JSONException;
import com.chargebee.org.json.JSONObject;
import com.google.common.annotations.VisibleForTesting;
import com.mongodb.BasicDBObject;
import java.io.IOException;
import java.net.URL;
import java.util.Date;
import javax.net.ssl.HttpsURLConnection;
import lombok.Setter;
import org.apache.commons.lang.StringEscapeUtils;

/**
 * Created by Ayush on 7/21/15.
 */
// Used in loggedin context when we have the account id.
public class ShopifyOAuthManager {

    public static final String HTTPS = "https://";
    private static final String X_SHOPIFY_URL = "/shopify/";

    private static final String OAUTH_VALIDATE_URL = "/admin/api/2021-07/shop.json";
    private static final String SHOP_GET_URL =
            "/admin/shop.json?fields=email,domain,myshopify_domain,iana_timezone,name,shop_owner,city,province,country_name";
    private static final String SCRIPT_TAG_POST_URL = "/admin/script_tags.json";
    private static final String SCRIPT_TAG_DELETE_URL = "/admin/script_tags/";
    private static final String ASSET_API_VERSION = "2023-10";
    private static final String THEME_POST_URL = "/admin/api/" + ASSET_API_VERSION + "/themes";
    public static final String THEME_ASSET_URL = "/admin/api/" + ASSET_API_VERSION + "/themes";
    private static final String THEME_GET_URL = THEME_ASSET_URL + ".json?fields=id,role";
    private static final String DELETE_WEBHOOK_URL = "/admin/api/2022-10/webhooks/";
    private static final String VERSION = "version";
    private static final String DELETE_KEYWORD = "DELETE";
    private static final String POST_KEYWORD = "POST";
    public static final String GET_KEYWORD = "GET";
    private static final String JSON_KEYWORD = ".json";
    // Use of Script Tag API was deprecated for shops connected post 1st December, 2022
    private static final int SCRIPT_TAG_DEPRECATED_TS = 1669833000;
    private static final String ASSETS_JSON_KEYWORD = "/assets.json";

    private static final CTLogger logger =
            CTLogger.make(ShopifyOAuthManager.class, CTLogger.Feature.SHOPIFY_PLUGIN);

    public String shop;
    private String code;
    private String signature;
    private String timestamp;
    @Setter
    private String access_token;
    private com.foo.shopify.utils.ShopifyUtils shopifyUtils;

    public ShopifyOAuthManager(String shop, String code, String signature, String timestamp) {
        if (shop != null && code != null) {
            this.shop = shop;
            this.code = code;
            this.signature = signature;
            this.timestamp = timestamp;
            shopifyUtils = new com.foo.shopify.utils.ShopifyUtils();
        } else {
            throw new IllegalStateException("The Shop Name or Code was missing");
        }
    }

    public static ShopifyOAuthManager getShopifyOAuthManager(String shop, String code,
            String signature, String timestamp) {
        return new ShopifyOAuthManager(shop, code, signature, timestamp);
    }

    public ShopifyOAuthManager() {
        // TODO : Write code to check if we have tokens
        // BasicDBObject accountMeta = this.findOne(new BasicDBObject("_id", accountID));
        access_token = AccountMetaDao.instance.getShopifyToken(AccountMetaDao.SHOPIFY_DATA);
        shop = AccountMetaDao.instance.getShopifyShopName(AccountMetaDao.SHOPIFY_DATA);
        shopifyUtils = new com.foo.shopify.utils.ShopifyUtils();
    }



    /**
     * Pre : The code and shop are provided to the class. Post: Makes a POST request to the Shopify
     * server and gets a OAuth Access Token
     */
    public String responseAccessToken() throws IOException, JSONException {
        this.access_token = shopifyUtils.responseAccessToken(code, shop);
        return this.access_token;

    }

    public JSONObject getShopDetails() throws Exception {
        JSONObject responseJSON =
                this.requestHelper(GET_KEYWORD, HTTPS + this.shop + SHOP_GET_URL, null);
        JSONObject shopData = (JSONObject) responseJSON.get("shop");
        if (shopData == null) {
            return null;
        }
        return shopData;
    }

	protected JSONObject requestHelper(String requestMethod, String urlString,
            JSONObject bodyParameters) throws IOException, JSONException {
        return shopifyUtils.requestHelper(requestMethod, urlString,
                bodyParameters, access_token);
    }



}
