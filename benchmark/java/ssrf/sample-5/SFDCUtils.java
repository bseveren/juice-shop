

import com.billingutils.BillingUtilsSecretManager;
import com.mongodb.BasicDBList;
import com.mongodb.BasicDBObject;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashSet;
import java.util.Set;
import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.NameValuePair;
import org.apache.http.client.entity.UrlEncodedFormEntity;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.message.BasicNameValuePair;
import org.apache.http.util.EntityUtils;
import org.jetbrains.annotations.NotNull;
import org.slf4j.Logger;

public class SFDCUtils {

    public static final String DEFAULT_UTM_MEDIUM = "ssdr";
    public static final String DEFAULT_UTM_SOURCE = "Self Serve";
    public static final String URL_REST_POSTFIX = "/services/apexrest/";


    // STAGING CREDS

    private static final String STAGE_URL = "https://test.salesforce.com/services/oauth2/token";

    // PROD CREDS
    private static final String PROD_URL =
            "https://fooapp.my.salesforce.com/services/oauth2/token";

    protected static final Logger logger = LoggerFactory.make();
    private static final CTLogger CT_LOGGER =
            CTLogger.make(SFDCUtils.class, CTLogger.Feature.SFDC_DATA_PUSH);

    /**
     * Token Request Constansts
     */

    private static final String CLIENT_ID = "client_id";
    private static final String CLIENT_SECRET = "client_secret";
    private static final String USERNAME = "username";
    private static final String PASSWORD = "password";
    private static final String GRANT_TYPE = "grant_type";

    public static final String SFDC_LAST_RUN_TS = "sfdc_last_run";
    public static final String ACCESS_TOKEN = "access_token";
    public static final String INSTANCE_URL = "instance_url";
    public static final String ID = "_id";
    public static final String TOKEN_TYPE = "token_type";
    public static final String ISSUED_TS = "issued_at";
    public static final String SIGNATURE = "signature";

    public static final String CONVERT_LEAD_URL_POSTFIX = "Ws_In_ConvertLead";
    public static final String UPDATE_ACCOUNT_URL_POSTFIX = "Ws_In_UpdateAccountDetails";
    public static final String UPDATE_ORG_ID = "WS_CTOrgID_Updation";
    public static final String SUCCESS = "Success";
    public static final String FAILURE = "failure";
    public static final String STATUS = "Status";
    protected static final String MESSAGE = "Message";
    private static final String CONTENT_TYPE = "Content-Type";
    public static final String CSM_FETCH_END_POINT = "/WS_CT_API_AccountCSM_Owner";
    public static final String FILE_UPLOAD_ENDPOINT = "/WS_File_Upload_API";
    public static final String UTF8 = "application/json;charset=utf-8";
    public static final String AUTHORIZATION = "Authorization";
    public static final String BEARER = "Bearer ";
    public static final String RESULT = "result";
    public static final int STATUS_OK = 200;
    public static final String CTORGID = "ctorgid";
    public static final String FILETITLE = "filetitle";
    public static final String FILEVERSION = "fileversion";
    public static final String CT_ORG_ID = "CT_Org_ID";

    private static boolean isProductionConnect = false;

    public static String getUrl() {
        return isProductionConnect ? PROD_URL : STAGE_URL;
    }

    public static void init(boolean isProduction) {
        isProductionConnect = isProduction;
    }


    public static class SFDCToken {

        String accessToken;
        String url;
        String id;
        String tokenType;
        long issuedTS;
        String signature;

        public SFDCToken(String accessToken, String url, String id, String tokenType, long issuedTS,
                String signature) {
            this.accessToken = accessToken;
            this.url = url;
            this.id = id;
            this.tokenType = tokenType;
            this.issuedTS = issuedTS;
            this.signature = signature;
        }

        public String getUrl() {
            return url;
        }

        public void setUrl(String url) {
            this.url = url;
        }

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getTokenType() {
            return tokenType;
        }

        public void setTokenType(String tokenType) {
            this.tokenType = tokenType;
        }

        public long getIssuedTS() {
            return issuedTS;
        }

        public void setIssuedTS(long issuedTS) {
            this.issuedTS = issuedTS;
        }

        public String getSignature() {
            return signature;
        }

        public void setSignature(String signature) {
            this.signature = signature;
        }


        public String getAccessToken() {
            return accessToken;
        }

        public void setAccessToken(String accessToken) {
            this.accessToken = accessToken;
        }
    }


    public static SFDCToken getSFDCTokenRequest() {

        try (CloseableHttpClient httpClient = HttpClients.createDefault()) {
            HttpPost httpPost = new HttpPost(getUrl());
            ArrayList<NameValuePair> postParameter = new ArrayList<>();
            postParameter.add(new BasicNameValuePair(CLIENT_ID, BillingUtilsSecretManager
                    .getSecretValue(BillingUtilsSecretManager.Secrets.SFDC_CLIENT_ID)));
            postParameter.add(new BasicNameValuePair(CLIENT_SECRET, BillingUtilsSecretManager
                    .getSecretValue(BillingUtilsSecretManager.Secrets.SFDC_SECRET)));
            postParameter.add(new BasicNameValuePair(USERNAME, BillingUtilsSecretManager
                    .getSecretValue(BillingUtilsSecretManager.Secrets.SFDC_USER_NAME)));
            postParameter.add(new BasicNameValuePair(PASSWORD,
                    BillingUtilsSecretManager
                            .getSecretValue(BillingUtilsSecretManager.Secrets.SFDC_PASSWORD)
                            + BillingUtilsSecretManager.getSecretValue(
                                    BillingUtilsSecretManager.Secrets.SFDC_TOKEN)));
            postParameter.add(new BasicNameValuePair(GRANT_TYPE, "password"));

            httpPost.addHeader(CONTENT_TYPE, "application/x-www-form-urlencoded");
            httpPost.setEntity(new UrlEncodedFormEntity(postParameter, "UTF-8"));
            try (CloseableHttpResponse response = httpClient.execute(httpPost)) {

                // If getting the token fails, slack and return
                if (response.getStatusLine().getStatusCode() != STATUS_OK) {
                    String msg = String.format("getSFDCTokenRequest response is %s",
                            response.getStatusLine().toString());
                    Slack.slack(msg, Slack.SlackChannel.SS_SFDC_INTEGRATION, false);
                    return null;
                }

                BasicDBObject responseObj = parseResponse(response);

                if (responseObj.get("error") != null) {
                    // error state
                    String msg = String.format("getSFDCTokenRequest SFDC TOKEN ERROR: is %s",
                            responseObj);
                    logger.error(msg);
                    Slack.slack(msg, Slack.SlackChannel.SS_SFDC_INTEGRATION, false);
                    return null;
                }

                SFDCToken token = null;
                try {
                    String accessToken = responseObj.getString(ACCESS_TOKEN);
                    String instanceURL = responseObj.getString(INSTANCE_URL);
                    String instanceID = responseObj.getString("id");
                    String tokenType = responseObj.getString(TOKEN_TYPE);
                    long issuedTS = Long.parseLong(responseObj.getString(ISSUED_TS, "0"));
                    String signature = responseObj.getString(SIGNATURE);
                    token = new SFDCToken(accessToken, instanceURL, instanceID, tokenType, issuedTS,
                            signature);
                } catch (NullPointerException e) {
                    // null values, bad response. skipping run
                    logger.error("SFDC BAD NPE", e);
                    return null;
                }

                logger.info("SFDC TOKEN RESPONSE: {}", responseObj);
                return token;
            } catch (Exception e) {
                logger.error("Exception in SFDC TOKEN ", e);
            }
        } catch (Exception e) {
            logger.error("can't get http client ", e);
        }
        return null;
    }




    public static BasicDBObject convertLead(SFDCUtils.SFDCToken sfdcToken, BasicDBObject record) {
        if (sfdcToken == null) {
            logger.error("SFDC convertLead -  token is null, record {}", record);
            return null;
        }
        try (CloseableHttpClient httpClient = HttpClients.createDefault()) {
            logger.info("SFDC convertLead conerting Lead for record : {}", record);
            HttpPost httpPost =
                    new HttpPost(sfdcToken.getUrl() + URL_REST_POSTFIX + CONVERT_LEAD_URL_POSTFIX);
            httpPost.addHeader(CONTENT_TYPE, "application/json;charset=utf-8");
            httpPost.addHeader("Authorization", "Bearer " + sfdcToken.getAccessToken());

            StringEntity entity = new StringEntity(record.toString());
            httpPost.setEntity(entity);

            try (CloseableHttpResponse response = httpClient.execute(httpPost)) {
                if (response.getStatusLine().getStatusCode() != STATUS_OK) {
                    String msg = String.format("convertLead response is %s",
                            response.getStatusLine().toString());
                    logger.error(msg);
                    Slack.slack(msg, Slack.SlackChannel.SS_SFDC_INTEGRATION, false);
                    return null;
                }
                BasicDBObject responseObj = parseResponse(response);
                logger.info("SFDC Utils conerting Lead response is {}", responseObj);
                String status = responseObj.getString(STATUS, FAILURE);
                if (status.equalsIgnoreCase(SUCCESS)) {
                    return responseObj;
                }
            } catch (Exception e) {
                logger.error("SFDC failed to convert Lead for Object {} ", record, e);
            }
        } catch (Exception e) {
            logger.error("SFDC get the client {} ", record, e);
        }
        return null;
    }

    public static BasicDBObject parseResponse(HttpResponse response) throws IOException {
        String jsonString = EntityUtils.toString(response.getEntity());
        return BasicDBObject.parse(jsonString);
    }

    @NotNull
    public static BasicDBList getOrgDataFromSFDC(SFDCToken sfdcToken) {
        BasicDBList result = new BasicDBList();
        if (sfdcToken == null) {
            CT_LOGGER.error(CTLogger.Priority.P2, "SFDC: token is null");
            return result;
        }
        try (CloseableHttpClient httpClient = HttpClients.createDefault()) {
            HttpGet httpGet =
                    new HttpGet(sfdcToken.getUrl() + URL_REST_POSTFIX + CSM_FETCH_END_POINT);
            httpGet.addHeader(CONTENT_TYPE, UTF8);
            httpGet.addHeader(AUTHORIZATION, BEARER + sfdcToken.getAccessToken());

            CloseableHttpResponse response = httpClient.execute(httpGet);
            CT_LOGGER.info("SFDC Utils CSM info response code is {}",
                    response.getStatusLine().getStatusCode());
            if (response.getStatusLine().getStatusCode() != STATUS_OK) {
                String msg = String.format("SFDC CSM info response is %s",
                        response.getStatusLine().toString());
                CT_LOGGER.error(CTLogger.Priority.P2, msg);
                Slack.slack(msg, Slack.SlackChannel.SS_SFDC_INTEGRATION, false);
                return result;
            }
            String responseString = EntityUtils.toString(response.getEntity());
            if (!responseString.isEmpty()) {
                BasicDBObject resultJson = BasicDBObject.parse(responseString);
                result = (BasicDBList) resultJson.get(RESULT);
                return result;
            }

        } catch (Exception e) {
            String msg = e.getMessage();
            CT_LOGGER.error(CTLogger.Priority.P2, msg, e);
            Slack.slack(msg, Slack.SlackChannel.SS_SFDC_INTEGRATION, false);
        }
        return result;
    }

    public static int uploadReportToSFDC(String report, String accountId, String fileName,
            SFDCToken sfdcToken) {
        if (sfdcToken == null) {
            CT_LOGGER.error(CTLogger.Priority.P2,
                    "[SfdcCsvUploader]: SFDC: token is null for accountId {}", accountId);
            return -1;
        }
        try (CloseableHttpClient httpClient = HttpClients.createDefault()) {
            String encodedString = Base64.getEncoder().encodeToString(report.getBytes());
            String url = sfdcToken.getUrl() + URL_REST_POSTFIX + FILE_UPLOAD_ENDPOINT;
            HttpPost httpPost = new HttpPost(url);
            httpPost.addHeader(AUTHORIZATION, BEARER + sfdcToken.getAccessToken());
            BasicDBObject requestBody = new BasicDBObject(CTORGID, accountId)

                    .append(FILETITLE, fileName).append(FILEVERSION, encodedString);

            HttpEntity entity = new StringEntity(requestBody.toString());
            httpPost.setEntity(entity);
            CloseableHttpResponse response = httpClient.execute(httpPost);
            if (response.getStatusLine().getStatusCode() != STATUS_OK) {
                return handleResponseNotOK(response, accountId);
            }
            CT_LOGGER.info("[SfdcCsvUploader]: Usage uploaded to SFDC for acc: {}", accountId);
            return STATUS_OK;
        } catch (Exception e) {
            String message =
                    "[SfdcCsvUploader] exception while uploading usage report to SFDC for accountId {}"
                            + accountId;
            CappedSlack.slack(Slack.SlackChannel.SS_SFDC_INTEGRATION, message, e.getMessage(), 5);
            CT_LOGGER.error(CTLogger.Priority.P2, message + "due to" + e.toString());
        }
        return -1;
    }

    public static int handleResponseNotOK(CloseableHttpResponse response, String accountId) {
        String msg = String.format(
                "[SfdcCsvUploader]: could not upload usage report file to SFDC %s for accountId %s",
                response.getStatusLine().toString(), accountId);
        CT_LOGGER.error(CTLogger.Priority.P2, msg);
        CappedSlack.slack(Slack.SlackChannel.SS_SFDC_INTEGRATION, "[SfdcCsvUploader] failed ", msg,
                5);
        return response.getStatusLine().getStatusCode();
    }

    public static Set<Integer> getSFDCAccountSet(SFDCToken token) {
        BasicDBList allOrgsOnSFDC = SFDCUtils.getOrgDataFromSFDC(token);
        Set<Integer> sfdcAccountSet = new HashSet<>();
        for (Object orgOnSFDC : allOrgsOnSFDC) {
            String orgId = ((BasicDBObject) orgOnSFDC).getString(CT_ORG_ID);
            try {
                sfdcAccountSet.add(AccountsUtil.decodeAccountId(orgId));
            } catch (Exception e) {
                CT_LOGGER.info("[SfdcCsvUploader] invalid orgID with sfdc data: {}", orgOnSFDC);
            }
        }
        return sfdcAccountSet;
    }


}
