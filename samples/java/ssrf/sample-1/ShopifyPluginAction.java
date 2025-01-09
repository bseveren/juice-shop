package com.foo.dashboard.action.account;

import static com.google.api.client.http.HttpMethods.POST;

import com.chargebee.org.json.JSONObject;
import com.mongodb.BasicDBList;
import com.mongodb.BasicDBObject;

import java.io.IOException;
import java.net.URL;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import javax.net.ssl.HttpsURLConnection;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang.StringUtils;
import org.apache.struts.action.ActionForm;
import org.apache.struts.action.ActionForward;
import org.apache.struts.action.ActionMapping;

public class ShopifyPluginAction extends BaseAction {

    private static final CTLogger cLogger =
            CTLogger.make(ShopifyPluginAction.class, CTLogger.Feature.SHOPIFY_PLUGIN);
    private static final String WEB_PUSH_ENABLED = "webPushEnabled";
    private static final String FOR_ACCOUNT_ID = "for Account ID : {}";
    private static final String ERROR_WHILE_CONFIGURING_WEB_PUSH_STATUS =
            "Error occurred while setting web push configuration.";
    private static final String ERROR_WHILE_CONFIGURING_ADVANCED_SETTINGS =
            "Error occurred while getting Shopify configuration advanced settings.";
    private static final String ERROR_WHILE_DISCONNECTING_SHOPIFY_PLUGIN =
            "Error occurred while disconnecting Shopify store.";
    private static final String GRAPHQL_ENDPOINT = "https://%s/admin/api/2023-07/graphql.json";
    private static final String APP_INSTALLATION_ID_QUERY =
            "{\n" + "    \"query\": \"{currentAppInstallation {id}}\",\n"
                    + "    \"variables\": {}\n" + "}";



    private static final String APP_INSTALLATION_ID_PATH = "data.currentAppInstallation.id";
    private static final String UPDATED_METAFIELDS_PATH = "data.metafieldsSet.metafields";
    private static final String WEB_PIXEL_PATH = "data.webPixelCreate.webPixel.id";
    private static final String DELETED_WEB_PIXEL_PATH = "data.webPixelDelete.deletedWebPixelId";



    @AccessFilterValue(role = Constants.AccessRole.CREATOR,
            typeOfOperations = RBACUtilsForDao.TypeOfOperation.Write)
    public void updateShopifyEventPref(ActionMapping mapping, ActionForm form,
            HttpServletRequest request, HttpServletResponse response) throws IOException {
        try {
            final BasicDBObject body = getRequestData(request);
            int accountId = getAccountId();
            ShopifyAdvancedConfigDto newAdvConfig =
                    objectMapper.convertValue(body, ShopifyAdvancedConfigDto.class);
            ShopifyAdvancedConfigDto savedAdvConfig =
                    ShopifyConfigurationDao.getInstance().getAdvancedConfig(accountId);
            updateWebhookConfig(savedAdvConfig, newAdvConfig);
            setAdvConfigurationFields(savedAdvConfig, newAdvConfig);
            if (Objects.nonNull(savedAdvConfig.getShop())) {
                // shop is connected, update settings on Shopify
                ShopifyConnectionDetailsDto connDetails =
                        ShopifyConfigurationDao.getInstance().getConnectionDetails(accountId);
                subscribeToWebhooks(newAdvConfig.getAddedWebhookEvents(), connDetails, accountId);
                unsubscribeWebhooks(newAdvConfig.getRemovedWebhookEvents(), connDetails,
                        accountId);
                updateDiscardedSDKEvents(savedAdvConfig, newAdvConfig, connDetails, accountId);
                ShopifyConfigurationDao.getInstance().setConnectionDetails(accountId, connDetails);
            }
            ShopifyConfigurationDao.getInstance().setAdvancedConfig(accountId, newAdvConfig);
            BasicDBObject updatedAdvConfig =
                    objectMapper.convertValue(newAdvConfig, BasicDBObject.class);
            String userName = getUser(request).getName();
            MetricsHelper.instance.recordEventForDashboardAndBiz(
                    "Shopify Event Configuration Updated", updatedAdvConfig, userName);
            modifyAdvConfigResp(updatedAdvConfig);
            writeSuccessJSON(updatedAdvConfig, request, response);
        } catch (Exception ex) {
            writeErrorJSON(ex.getMessage(), request, response);
        } catch (Exception ex) {
            writeErrorJSON(ERROR_WHILE_CONFIGURING_ADVANCED_SETTINGS, request, response);
            cLogger.error(CTLogger.Priority.P2,
                    ERROR_WHILE_CONFIGURING_ADVANCED_SETTINGS + FOR_ACCOUNT_ID,
                    getAccountId(), ex);
        }

    }

    private void updateWebhookConfig(ShopifyAdvancedConfigDto savedAdvConfig,
            ShopifyAdvancedConfigDto newAdvConfig) throws Exception {
        if (!CollectionUtils.containsAll(savedAdvConfig.getEnabledWebhookEvents(),
                newAdvConfig.getRemovedWebhookEvents())) {
            throw new Exception("Webhooks to be removed haven't been subscribed");
        }
        if (CollectionUtils.containsAny(savedAdvConfig.getEnabledWebhookEvents(),
                newAdvConfig.getAddedWebhookEvents())) {
            throw new Exception("Webhooks to be added have already been subscribed");
        }
        Set<String> webhookList = savedAdvConfig.getEnabledWebhookEvents();
        webhookList.addAll(newAdvConfig.getAddedWebhookEvents());
        webhookList.removeAll(newAdvConfig.getRemovedWebhookEvents());
        newAdvConfig.setEnabledWebhookEvents(webhookList);
    }


    private void setAdvConfigurationFields(ShopifyAdvancedConfigDto savedAdvConfig,
            ShopifyAdvancedConfigDto newAdvConfig) {
        newAdvConfig.setWebPushEnabled(savedAdvConfig.isWebPushEnabled());
        DateTime.setTZ(AccountMetaDao.instance.getAccountMeta().getTz());
        newAdvConfig.setUpdatedAt(DateTime.epoch() / 1000);
    }

    @AccessFilterValue(role = Constants.AccessRole.CREATOR,
            typeOfOperations = RBACUtilsForDao.TypeOfOperation.Write)
    public void disconnect(ActionMapping mapping, ActionForm form,
            HttpServletRequest request, HttpServletResponse response) throws IOException {
        try {
            int accountId = getAccountId();
            ShopifyAdvancedConfigDto savedAdvConfig =
                    ShopifyConfigurationDao.getInstance().getAdvancedConfig(accountId);
            if (StringUtils.isEmpty(savedAdvConfig.getShop())) {
                writeErrorJSON("No Shopify Store is connected to this account", request, response);
                return;
            }
            cLogger.info("Disconnecting Shopify Plugin. shop {}, user: {}",
                    savedAdvConfig.getShop(), getUser(request).getLogin());
            ShopifyConnectionDetailsDto connDetails =
                    ShopifyConfigurationDao.getInstance().getConnectionDetails(accountId);
            unsubscribeWebhooks(savedAdvConfig.getEnabledWebhookEvents(), connDetails, accountId);
            updateAppMetafields(savedAdvConfig, connDetails, accountId, false);
            // delete app pixel
            deleteAppPixel(connDetails, accountId);
            ShopifyConfigurationDao.getInstance().markShopDisconnected(getAccountId());
            CompletableFuture.runAsync(() -> updateShopifyAppStatus(savedAdvConfig.getShop(),
                    ShopStatus.APP_INSTALLED));
            String userName = getUser(request).getName();
            MetricsHelper.instance.recordEventForDashboardAndBiz("Shopify Plugin Disconnected",
                    objectMapper.convertValue(savedAdvConfig, BasicDBObject.class), userName);
            ChangeHelper.instance.recordChangeAndNotifyASync(
                    ChangeHelper.Change.SHOPIFY_DISCONNECTED,
                    new BasicDBObject("action", "disconnected"), getUser(request), true);
            cLogger.info("Disintegrated shopify for account: {}, user: {}, shopName: {}", accountId,
                    getUser(request).getLogin(),
                    savedAdvConfig.getShop());
            writeSuccessJSON(request, response);
        } catch (Exception ex) {
            writeErrorJSON(ERROR_WHILE_DISCONNECTING_SHOPIFY_PLUGIN, request, response);
            cLogger.error(CTLogger.Priority.P2,
                    ERROR_WHILE_DISCONNECTING_SHOPIFY_PLUGIN + FOR_ACCOUNT_ID,
                    getAccountId(), ex);
        }

    }





    private void unsubscribeWebhooks(Set<String> webhooksToRemove,
            ShopifyConnectionDetailsDto connectionsDetails, int accountId) {
        com.foo.shopify.utils.ShopifyUtils shopifyUtils = getShopifyUtils();
        BasicDBObject webhookIds = connectionsDetails.getWebhookIds();
        webhooksToRemove.stream().filter(webhookIds::containsField).forEach(webhookEvName -> {
            try {
                String webhookId = webhookIds.getString(webhookEvName);
                int respCode = shopifyUtils.callUnsubscribeWebhook(webhookId,
                        connectionsDetails.getShop(), connectionsDetails.getAccessToken());
                // resp code 200 if deleted successfully and 404 if webhook doesn't exist
                if (respCode != HttpServletResponse.SC_OK
                        && respCode != HttpServletResponse.SC_NOT_FOUND) {
                    String msg = String.format(
                            "Webhook Deletion Declined. ResponseCode: %d", respCode);
                    throw new Exception(msg);
                }
                connectionsDetails.getWebhookIds().remove(webhookEvName);
            } catch (Exception e) {
                String message = String.format(
                        "Webhook Deletion Error. accountId: %s, shop: %s, webhookEventName: %s, Error: %s",
                        accountId, connectionsDetails.getShop(), webhookEvName, e.getMessage());
                throw new RunTimeException(message);
            }
        });

    }


    public String getWebhookEndPoint(int acctId) {
        Region region = DatacenterRegion.instance.region();
        String accountId = AccountsUtil.encodeAccountId(acctId);
        return region.apiRootURL + "/shopify/"
                + ShopifyUtils.ApiType.CONFIGURABLE_INTEGRATION.getType() + "/"
                + accountId;
    }


}
