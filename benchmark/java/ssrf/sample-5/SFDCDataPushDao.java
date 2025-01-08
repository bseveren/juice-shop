
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

       public void convertLead(String email, BasicDBObject orgInfo) {
        if (orgInfo == null) {
            logger.error("SFDC convertLead - org not found email id {}", email);
            return;
        }
        if (OrgDao.instance.isUserInternal(email)) {
            logger.info("Internal user, Skipping for lead conversion email {}", email);
            return;
        }
        int orgId = orgInfo.getInt(ID);
        int parentAccountId = orgInfo.getInt(OrgDao.PARENT);
        String encAccId = AccountsUtil.encodeAccountId(parentAccountId);
        BasicDBObject sfdcDetails =
                SFDCDataPushDao.instance.findOne(new BasicDBObject(ID, parentAccountId));
        if (sfdcDetails != null) {
            logger.info(
                    "SFDC lead has already converted for email id {} sfdc org id {} and encoded Account Id {}",
                    email, orgId, encAccId);
            return;
        }
        try {
            SFDCUtils.SFDCToken token = SFDCUtils.getSFDCTokenRequest();
            if (token == null) {
                logger.error(
                        "SFDC convertLead token is null for email id {} sfdc org id {} and encoded Account Id {}",
                        email, orgId, encAccId);
                return;
            }
            BasicDBObject tempUser = SignupUserDao.instance.getUser(email);
            if (tempUser == null) {
                logger.error(
                        "SFDC convertLead user details is null for email id {} sfdc org id {} and encoded Account Id {}",
                        email, orgId, encAccId);
                return;
            }
            BasicDBObject pricingDetails = (BasicDBObject) tempUser.get(KEY_PRICING_DETAILS);
            if (pricingDetails == null) {
                logger.error(
                        "SFDC convertLead pricing details is null for email id {} sfdc org id {} and encoded Account Id {}",
                        email, orgId, encAccId);
                return;
            }
            String currency =
                    pricingDetails.getString(BillingInfoDao.CHARGEBEE_CURRENCY, StringUtils.EMPTY);
            String legalEntity =
                    ChargeBeeKeys.instance.isINR(currency) ? LEGAL_ENTITY_INDIA : LEGAL_ENTITY_USA;
            String region =
                    ChargeBeeKeys.instance.isINR(currency) ? LEGAL_ENTITY_INDIA : REGION_USA;
            String planId = orgInfo.getString(PLAN_ID, "");
            String chargeBeeEnv = tempUser.getString(CHARGEBEE_ENV, StringUtils.EMPTY);
            int mauQuantity = SignupUserDao.instance.getMauCount(pricingDetails);
            BasicDBObject planDetails = SelfServeUtils.getPlanTierDetailsFromCache(planId, currency,
                    chargeBeeEnv, mauQuantity);
            if (planDetails == null) {
                logger.error("Got empty plan tier info for plan id: {} from chargebee", planId);
                return;
            }

            int now = (int) (System.currentTimeMillis() / 1000L);
            int trialEndDate = tempUser.getInt(BillingInfoDao.KEY_CHARGEBEE_TRIAL_END, 0);
            trialEndDate = trialEndDate > 0 ? trialEndDate : now;
            DateTime.setTZ(DateUtil.CHARGE_BEE_TZ_ID);
            String trialEndDateStr =
                    new SimpleDateFormat(SFDC_DATE_FORMAT).format(new Date(trialEndDate * 1000L));
            String trialStartDateStr =
                    new SimpleDateFormat(SFDC_DATE_FORMAT).format(new Date(orgId * 1000L));
            String subStartDateStr = new SimpleDateFormat(SFDC_DATE_FORMAT)
                    .format(new Date((trialEndDate + 2) * 1000L));

            BasicDBObject data = new BasicDBObject(LEAD_EMAIL, email).append(CT_TRIAL_ID, orgId)
                    .append(TRIAL_START_DATE, trialStartDateStr)
                    .append(TRIAL_END_DATE, trialEndDateStr).append(CT_ORG_ID, encAccId);
            BasicDBObject quote = new BasicDBObject(MAU_QTY, mauQuantity)
                    .append(DATA_POINTS, DATA_POINTS_FUP).append(DRP_QTY, 12)
                    .append(BILLING_FREQUENCY, MONTHLY).append(PAYMENT_TERMS, NET_30)
                    .append(BILLING_METHOD, PRE_BILLING_METHOD)
                    .append(TRIAL_MONTHS, NO_OF_TRIAL_PERIOD_MONTH)
                    .append(PAYMENT_TERMS, PAYMENT_TERM_SS)
                    .append(PAYMENT_METHOD, PAYMENT_METHOD_CREDIT_CARD)
                    .append(LEGAL_ENTITY, legalEntity).append(REGION_C, region)
                    .append(BILL_MONTHS, TOTAL_BILLING_MONTHS)
                    .append(SUBS_START_DATE, subStartDateStr)
                    .append(LIST_PRICE_PER_MONTH, planDetails.getString("price"));

            data.append(QUOTE, quote);
            BasicDBList quoteLine = new BasicDBListW(new BasicDBObject(PLAN, STARTUP));
            data.append(QUOTE_LINES, quoteLine);
            BasicDBObject response = SFDCUtils.convertLead(token, data);
            if (response == null) {
                String msg = String.format(
                        "Unable to convert Lead in SFDC email id %s sfdc org id %d and Encoded Account Id %s",
                        email, orgId, encAccId);
                logger.error(msg);
                Slack.slack(msg, Slack.SlackChannel.SS_SFDC_INTEGRATION, false);
                return;
            }

            BasicDBObject query = new BasicDBObject(ID, parentAccountId);
            BasicDBObject update = new BasicDBObject(ORG_ID, String.valueOf(orgId))
                    .append(ACCOUNT_ID, response.getString(ACCOUNT_ID))
                    .append(CONTACT_ID, response.getString(CONTACT_ID))
                    .append(OPPORTUNITY_ID, response.getString(OPPORTUNITY_ID))
                    .append(QUOTE_ID, response.getString(QUOTE_ID)).append(OrgDao.PARENT, encAccId);
            SFDCDataPushDao.instance.upsertIntoDb(query, update);
            String msg = String.format(
                    "lead is converted in the sfdc for sfdc org id %d email id %s and encoded Account Id %s",
                    orgId, email, encAccId);
            logger.info(msg);
            Slack.slack(msg, Slack.SlackChannel.SS_SFDC_INTEGRATION, false);
        } catch (Exception e) {
            String msg = String.format(
                    "lead conversion failed for sfdc org id %d email id %s and encoded Account Id %s",
                    orgId, email, encAccId);
            logger.error(msg, e);
            Slack.slack(msg, Slack.SlackChannel.SS_SFDC_INTEGRATION, false);
        }

    }

}
