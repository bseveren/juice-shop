package com.foo.dashboard.action.account;

import static com.google.api.client.http.HttpMethods.POST;

import com.chargebee.org.json.JSONObject;
import com.mongodb.BasicDBList;
import com.mongodb.BasicDBObject;
import com.foo.dashboard.Constants;
import com.foo.dashboard.Utils;
import com.foo.dashboard.action.BaseAction;
import com.foo.dashboard.annotations.AccessFilterValue;
import com.foo.dashboard.helpers.ChangeHelper;
import com.foo.dashboard.helpers.MetricsHelper;
import com.foo.dashboard.utils.plugins.shopify.ShopifyOAuthManager;
import com.foo.db.ShopifyConfigurationDao;
import com.foo.db.dao.AccountMetaDao;
import com.foo.db.dto.DatacenterRegion;
import com.foo.db.dto.ShopifyAdvancedConfigDto;
import com.foo.db.dto.ShopifyConnectionDetailsDto;
import com.foo.db.dto.User;
import com.foo.db.utils.RBACUtilsForDao;
import com.foo.db.utils.shopify.ShopStatus;
import com.foo.db.utils.shopify.ShopifyWebhookEvents;
import com.foo.logging.CTLogger;
import com.foo.mongo.BasicDBUtils;
import com.foo.shopify.utils.ShopifyUtils;
import com.foo.utils.AccountsUtil;
import com.foo.utils.Region;
import com.foo.utils.constants.AppConstants;
import com.foo.utils.exception.fooException;
import com.foo.utils.exception.fooRunTimeException;
import com.foo.utils.format.DateTime;
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

    private BasicDBObject getRequestData(HttpServletRequest request) {
        return Utils.getRequestData(request, cLogger, CTLogger.Priority.P2);
    }

    @AccessFilterValue(role = Constants.AccessRole.CREATOR,
            typeOfOperations = RBACUtilsForDao.TypeOfOperation.Write)
    public ActionForward connectShopifyPlugin(ActionMapping mapping, ActionForm form,
            HttpServletRequest request, HttpServletResponse response) {
        String shopName = request.getParameter("shop");
        User usr = getUser(request);
        int accountId = -1;
        cLogger.info("Connecting Shopify Plugin. shop {}, user: {}", shopName, usr.getLogin());
        try {
            com.foo.shopify.utils.ShopifyUtils shopifyUtils = getShopifyUtils();
            String accessToken =
                    shopifyUtils.responseAccessToken(request.getParameter("code"), shopName);
            accountId = AccountMetaDao.instance.getAccountIdForShopifyStore(shopName);
            validateAccount(accountId, shopName, usr);
            AppConstants.ACCOUNT_ID.set(String.valueOf(accountId));
            ShopifyConnectionDetailsDto connectionDetailsDto = new ShopifyConnectionDetailsDto();
            connectionDetailsDto.setAccessToken(accessToken);
            connectionDetailsDto.setShop(shopName);
            ShopifyAdvancedConfigDto advConfig =
                    ShopifyConfigurationDao.getInstance().getAdvancedConfig(accountId);
            subscribeToWebhooks(advConfig.getEnabledWebhookEvents(), connectionDetailsDto,
                    accountId);
            connectionDetailsDto.setAppInstallationId(getAppInstallationId(connectionDetailsDto));
            updateAppMetafields(advConfig, connectionDetailsDto, accountId, true);
            DateTime.setTZ(AccountMetaDao.instance.getAccountMeta().getTz());
            connectionDetailsDto.setConnectedTs(DateTime.epoch() / 1000);
            // set app pixel
            String appPixelId = configureAppPixel(connectionDetailsDto, accountId);
            connectionDetailsDto.setAppPixelId(appPixelId);
            ShopifyConfigurationDao.getInstance().setConnectionDetails(accountId,
                    connectionDetailsDto);
            CompletableFuture.runAsync(() -> updateShopifyAppStatus(shopName,
                    ShopStatus.CONNECTED));
            ChangeHelper.instance.recordChangeAndNotifyASync(ChangeHelper.Change.SHOPIFY_CONNECTED,
                    new BasicDBObject("action", "connected"), usr, true);
            cLogger.info("Integrated shopify for account: {}, user: {}, shopName: {}", accountId,
                    usr.getLogin(), shopName);
            return mapping.findForward("integrate-shopify");
        } catch (Exception e) {
            cLogger.error(CTLogger.Priority.P1,
                    String.format("Shopify Integration Error. accountId: %d, shop: %s, user: %s",
                            accountId, shopName, usr.getLogin()),
                    e);
            return null;
        } finally {
            AccountMetaDao.instance.removeShopifyIntegrationFlags(accountId);
        }
    }


    private void updateShopifyAppStatus(String shopName,
            ShopStatus status) {
        ShopifyOAuthManager oAuthManager = new ShopifyOAuthManager(shopName, shopName, null, null);
        oAuthManager.updateShopifyAppStatus(shopName, status);
    }


}
