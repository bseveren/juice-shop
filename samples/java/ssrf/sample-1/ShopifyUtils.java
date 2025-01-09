package com.foo.shopify.utils;


import static java.nio.charset.StandardCharsets.UTF_8;

import com.chargebee.org.json.JSONException;
import com.chargebee.org.json.JSONObject;
import java.io.*;
import java.net.URL;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import javax.net.ssl.HttpsURLConnection;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.apache.commons.codec.BinaryEncoder;
import org.apache.commons.codec.EncoderException;
import org.apache.commons.codec.binary.Base64;
import org.apache.commons.lang.StringUtils;

public class ShopifyUtils {
    public static final String API_KEY = "fb1a9fa78640333428420e4c1467c952";
    public static final String SEC_KEY = "51259ad5af07c415cc8855e68d042edd";
    private static final String OAUTH_POST_URL = "/admin/oauth/access_token";
    private static final String USER_AGENT = "Mozilla/5.0";
    private static final String POST_KEYWORD = "POST";
    private static final String DELETE_KEYWORD = "DELETE";
    public static final String HTTPS = "https://";
    private static final String JSON_KEYWORD = ".json";
    private static final String POST_WEBHOOK_URL = "/admin/api/2022-10/webhooks.json";
    private static final String DELETE_WEBHOOK_URL = "/admin/api/2022-10/webhooks/";
    private static final String WEBHOOK_KEYWORD = "webhook";
    public static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final CTLogger logger =
            CTLogger.make(ShopifyUtils.class, CTLogger.Feature.SHOPIFY_PLUGIN);
    public static final String SHOPIFY_HMAC_STRING = "X-Shopify-Hmac-SHA256";
    public static final String SHOP = "shop";

    public enum ApiType {
        MANUAL_INTEGRATION("m"), AUTOMATIC_INTEGRATION("a"), CONFIGURABLE_INTEGRATION("c");

        private String type;

        ApiType(String type) {
            this.type = type;
        }

        public String getType() {
            return type;
        }

        private static ApiType[] vals = values();

        public static ApiType get(String type) {
            for (ApiType val : vals) {
                if (val.getType().equals(type)) {
                    return val;
                }
            }
            return null;
        }
    }

    @Getter
    @AllArgsConstructor
    public enum ShopifyProfileProperties {
        TAGS("Tags", "tags"),
        CITY("City", "default_address.city"),
        ORDERS_COUNT("Orders Count", "orders_count"),
        TOTAL_SPENT("Total Spent", "total_spent"),
        SHOPIFY_ID("Shopify ID", "id"),
        FIRST_NAME("First Name", "first_name"),
        LAST_NAME("Last Name", "last_name"),
        LAST_ORDER_ID("Last Order ID", "last_order_id"),
        HAS_ACCOUNT("Has Account", "state"),
        TAX_EXEMPT("Tax Exempt", "tax_exempt"),
        EMAIL_MARKETING_CONSENT("Email Marketing Consent", "email_marketing_consent.state"),
        SMS_MARKETING_CONSENT("SMS Marketing Consent", "sms_marketing_consent.state"),
        NOTE("Note", "note"),
        CURRENCY("Currency", "currency");

        private final String propertyName;
        private final String propertyPath;
        private static final ShopifyProfileProperties[] vals = values();

        public static ShopifyProfileProperties get(String propertyName) {
            for (ShopifyProfileProperties val : vals) {
                if (val.getPropertyName().equals(propertyName)) {
                    return val;
                }
            }
            return null;
        }
    }



    /**
     * Pre : The code and shop are provided to the class. Post: Makes a POST request to the Shopify
     * server and gets a OAuth Access Token
     */
    public String responseAccessToken(String code, String shopName)
            throws IOException, JSONException {

        // Creates a JSON for Body Parameters - Could throw JSONException
        JSONObject bodyParameters = new JSONObject();
        bodyParameters.put("client_id", ShopifyUtils.API_KEY);
        bodyParameters.put("client_secret", ShopifyUtils.SEC_KEY);
        bodyParameters.put("code", code);

        JSONObject responseJSON =
                requestHelper(POST_KEYWORD, HTTPS + shopName + OAUTH_POST_URL, bodyParameters,
                        null);

        return responseJSON.get("access_token").toString();

    }

    public JSONObject requestHelper(String requestMethod, String urlString,
            JSONObject bodyParameters, String accessToken) throws IOException {
        URL url = new URL(urlString);
        HttpsURLConnection con = (HttpsURLConnection) url.openConnection();

        return requestHelper(requestMethod, urlString, bodyParameters, accessToken, con);

    }

    public String subscribeWebhook(ShopifyWebhookEvents webhook, String shop,
            String accessToken, String webhookSubscriptionUrl) throws IOException {
        JSONObject bodyParameters = new JSONObject();
        String id = "";
        JSONObject asset = new JSONObject();
        asset.put("address", webhookSubscriptionUrl);
        asset.put("topic", webhook.getTopic());
        asset.put("format", "json");
        bodyParameters.put(WEBHOOK_KEYWORD, asset);
        JSONObject responseJSON = callSubscribeWebhook(bodyParameters, shop, accessToken);
        try {
            JSONObject webhookJSONObject = ((JSONObject) responseJSON.get(WEBHOOK_KEYWORD));
            if (webhookJSONObject != null) {
                id = webhookJSONObject.get(AbstractDao.id).toString();
            }
        } catch (JSONException e) {
            Profiler.report(String.format(
                    "Webhook not registered for ShopifyStore=%s, responseJson=%s ,webhook-topic=%s",
                    shop, responseJSON, webhook.getTopic()), 1, e, CTLogger.Feature.SHOPIFY_PLUGIN,
                    CTLogger.Priority.P2);
        }
        return id;
    }

    public JSONObject callSubscribeWebhook(JSONObject bodyParameters, String shop,
            String accessToken) throws IOException {
        return requestHelper(POST_KEYWORD, HTTPS + shop + POST_WEBHOOK_URL, bodyParameters,
                accessToken);
    }

    public int callUnsubscribeWebhook(String webhookId, String shop,
            String accessToken) throws IOException {
        URL url = new URL(HTTPS + shop + DELETE_WEBHOOK_URL + webhookId + JSON_KEYWORD);
        HttpsURLConnection con = (HttpsURLConnection) url.openConnection();
        return requestHelper(DELETE_KEYWORD, null, accessToken, con);
    }

    public JSONObject requestHelper(String requestMethod, String urlString,
            JSONObject bodyParameters, String accessToken, HttpsURLConnection con)
            throws IOException, JSONException {
        int responseCode = requestHelper(requestMethod, bodyParameters, accessToken, con);
        StringBuilder response = getResponseString(responseCode, con);
        logResponse(urlString, requestMethod, responseCode, bodyParameters,
                String.valueOf(response));

        if (StringUtils.isEmpty(String.valueOf(response))) {
            return new JSONObject();
        }
        return new JSONObject(response.toString());
    }

    public StringBuilder getResponseString(int responseCode, HttpsURLConnection con)
            throws IOException {
        InputStream inputStream;
        if (responseCode >= HttpServletResponse.SC_BAD_REQUEST) {
            inputStream = con.getErrorStream();
        } else {
            inputStream = con.getInputStream();
        }
        BufferedReader in = new BufferedReader(new InputStreamReader(inputStream));
        String inputLine;
        StringBuilder response = new StringBuilder();
        while ((inputLine = in.readLine()) != null) {
            response.append(inputLine);
        }
        in.close();
        return response;
    }



    public int requestHelper(String requestMethod, JSONObject bodyParameters,
            String accessToken, HttpsURLConnection con) throws IOException {
        // Adds request method & header
        con.setRequestMethod(requestMethod);
        con.setRequestProperty("User-Agent", USER_AGENT);
        con.setRequestProperty("Accept-Language", "en-US,en;q=0.5");
        con.setRequestProperty("Content-Type", "application/json");
        con.setRequestProperty("X-Shopify-Access-Token", accessToken);
        con.setDoOutput(true);
        // Add Body Headers
        if (bodyParameters != null) {
            DataOutputStream wr = new DataOutputStream(con.getOutputStream());
            wr.writeBytes(bodyParameters.toString());
            wr.flush();
            wr.close();
        }
        return con.getResponseCode();
    }
}
