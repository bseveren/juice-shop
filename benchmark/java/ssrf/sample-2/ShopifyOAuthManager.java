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
import com.foo.dashboard.helpers.MetricsHelper;
import com.foo.db.ShopifyWhitelistedShopsDao;
import com.foo.db.dao.AccountMetaDao;
import com.foo.db.dto.DatacenterRegion;
import com.foo.db.utils.shopify.ShopStatus;
import com.foo.db.utils.shopify.ShopifyWebhookEvents;
import com.foo.logging.CTLogger;
import com.foo.shopify.utils.ShopifyUtils.ApiType;
import com.foo.utils.AccountsUtil;
import com.foo.utils.Region;
import com.foo.utils.constants.AppConstants;
import com.foo.utils.format.DateTime;
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

    public static final String SHOPIFY_FOO_APP_STATUS_URL =
            getDefaultShopifyRegionApiEndpoint() + "/shopifyFooAppStatus";

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



    /**
     * Hits default region LC to get the status of the foo app installed on a given shopify
     * store
     *
     * @param bodyParameters JSON body which contains shop name and status if its to be updated
     * @return JSON response from LC which conatains shop status
     */
    public JSONObject shopifyAppStatusHelper(JSONObject bodyParameters) {

        try {
            URL url = new URL(SHOPIFY_FOO_APP_STATUS_URL);
            HttpsURLConnection con = (HttpsURLConnection) url.openConnection();
            con.setRequestProperty(com.foo.shopify.utils.ShopifyUtils.SHOPIFY_HMAC_STRING,
                    com.foo.shopify.utils.ShopifyUtils
                            .generateHMACKey(bodyParameters.toString()));
            return requestHelperForAppStatus(bodyParameters, con);
        } catch (Exception e) {
            logger.error(CTLogger.Priority.P2,
                    String.format(
                            "Exception occurred while getting shopify app status. ShopifyStore=%s",
                            this.shop),
                    e);
            return new JSONObject();
        }

    }


    public void updateShopifyAppStatus(String shopName,
            ShopStatus status) {
        if (isDefaultShopifyRegion()) {
            ShopifyWhitelistedShopsDao.instance.updateShopStatusInMongo(status.ordinal(), shopName);
        } else {
            JSONObject bodyParameters = new JSONObject();
            bodyParameters.put(com.foo.shopify.utils.ShopifyUtils.SHOP, shopName);
            bodyParameters.put(STATUS, status.ordinal());
            shopifyAppStatusHelper(bodyParameters);
        }
    }

}
