package com.foo.dashboard.action.account;


import com.fasterxml.jackson.core.type.TypeReference;
import com.mongodb.BasicDBList;
import com.mongodb.BasicDBObject;
import com.mongodb.DBObject;
import com.mongodb.MongoWriteException;

import java.io.IOException;
import java.net.URL;
import java.util.List;
import java.util.concurrent.TimeUnit;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import org.apache.commons.io.IOUtils;
import org.apache.struts.action.ActionForm;
import org.apache.struts.action.ActionForward;
import org.apache.struts.action.ActionMapping;
import org.bson.json.JsonParseException;
import org.slf4j.Logger;

@AllArgsConstructor(onConstructor = @__(@javax.inject.Inject))
public class ContentAPISettingAction extends BaseAction {

    private static final String USERACCESS = "useraccess";
    protected static final String ID_STRING = "_id";
    public static final String CREATED_BY = "created-by";
    protected static final String IS_SETTINGS_VIEW = "isSettings";
    private static final String CREATED_ON = "created-on";
    private static final String NAMESPACE = "name";
    private static final String ENDPOINT = "url";
    private static final String HTTP_METHOD = "method";

    private static final String INVALID_CONTENT_API = "Oops";
    private static final String CONTENT_API_NOT_LOADED =
            "Something unexpected happened. Please try again.";

    protected static final String ALLCONTENTAPI = "allContentApi";
    private static final String TESTPARAMINFO = "testParamInfo";
    private static final String SWAL_TITLE_KEY = "title";
    private static final String SWAL_TEXT_KEY = "text";
    private static final String SWAL_TYPE_KEY = "type";
    public static final String ERROR = "error";
    public static final String SUCCESS = "success";
    private static final String RESPONSE = "response";
    protected static final String RESPONSE_RETURNED_ERROR = "Response returned an error";
    private static final String NAMESPACE_CREATED_EVENT = "Linked content API creation completed";
    private static final String URL_PERSONALISATION_USED = "URL personalisation used";
    private static final String PERSONALISED_URL_REGEX = "\\{\\{[a-zA-Z0-9]+}}";
    private static final String REQUEST_PARSING_ERROR = "Error while parsing request data";
    private static final String INVALID_REQUEST = "Invalid Request";
    private static final String FEATURE_USED = "Feature used";
    private static final String URL_TYPE_EVENT_PROP = "url type";
    private static final String AUTH_USES_EVENT_PROP = "Auth used";

    private static final String READ_WRITE_ACCESS = "rw";
    private static final String READ_ACCESS = "r";

    private static final CTLogger CT_LOGGER =
            CTLogger.make(ContentAPISettingAction.class, CTLogger.Feature.LINKED_CONTENT);

    private final DemoUtils demoUtils;
    private final DemoDataApiClient demoDataApiClient;



    @AccessFilterValue(access = Constants.ROOT, role = Constants.AccessRole.CREATOR,
            feature = campaign_integration_settings, subComponents = Integration,
            typeOfOperations = Read)
    public ActionForward testContentAPI(ActionMapping mapping, ActionForm form,
            HttpServletRequest request, HttpServletResponse response)
            throws NumberFormatException, IOException {
        AccountMeta accountMeta = AccountMetaDao.instance.getAccountMeta();
        int accountId = Integer.parseInt(accountMeta.getAcct());
        ContentApiResponse contentApiResponse = null;
        ContentApiDTO _dto = null;
        DBObject responseData = null;
        BasicDBObject source = null;
        source = getData(request);
        BasicDBObject output = new BasicDBObject();
        if (source == null) {
            addSwalTexts(output, INVALID_REQUEST, REQUEST_PARSING_ERROR, ERROR);
            sendJsonResponse(request, response, output);
            return null;
        }

        BasicDBList paramsList = (BasicDBList) source.get(ContentApiDTO.PARAMSINFO);
        for (Object obj : paramsList) {

            String paramVal = getParamVal((BasicDBObject) obj);
            boolean mandatory = ((BasicDBObject) obj).getBoolean(ContentApiDTO.MANDATORYVAL, false);
            if (mandatory && (paramVal == null || paramVal.isEmpty())) {
                addSwalTexts(output, "Mandatory Parameters not passed",
                        "Request failed since parameter marked as mandatory was not passed", ERROR);
                sendJsonResponse(request, response, output);
                return null;
            }
        }

        String endpoint = source.getString(ContentApiDTO.ENDPOINT);

        try {
            _dto = ContentApiDTO.getFromDBObject(accountId, source);
        } catch (Exception e) {
            logger.error("exception while creating DTO Object ={} for accountid={}", e, accountId);
            addSwalTexts(output, RESPONSE_RETURNED_ERROR, "Internal Server Error,Please Try again",
                    ERROR);
            output.put(RESPONSE, responseData);
            sendJsonResponse(request, response, output);
            return null;
        }

        endpoint = ContentApiParams.replacePathParams(_dto, endpoint);

        if (!validateEndpoint(endpoint, output, accountId, this.logger)) {
            sendJsonResponse(request, response, output);
            return null;
        }

        try {
            contentApiResponse = testAPICall(_dto);
            if (contentApiResponse.getJsonResponse() != null) {
                responseData = contentApiResponse.getJsonResponse();
            }
        } catch (Exception e) {
            logger.error("exception while test api call={},for accountid={}", e, accountId);
            addSwalTexts(output, RESPONSE_RETURNED_ERROR, "Internal Server Error,Please Try again",
                    ERROR);
            output.put(RESPONSE, responseData);
            sendJsonResponse(request, response, output);
            return null;
        }

        if (responseData != null) {
            addSwalTexts(output, SUCCESS, "Response Fetched Successfully", SUCCESS);
            output.put(RESPONSE, responseData);
        } else {
            String error_string = "";
            addSwalTexts(output, RESPONSE_RETURNED_ERROR,
                    "Please ensure the response is accurate and does not return an error to save the namespace",
                    ERROR);
            output.put(RESPONSE, responseData);
            if (contentApiResponse.getRawResponse() != null) {
                error_string = "Response type not supported, expected json";
            } else {
                error_string = "(" + contentApiResponse.getResponseCode()
                        + ") Couldn't process response. Please check the error code details and try again.";
            }
            output.put(ERROR, error_string);
        }
        sendJsonResponse(request, response, output);
        return null;
    }



    public ContentApiResponse testAPICall(ContentApiDTO contentApiDTO) throws IOException {
        if (demoUtils.isDemo(contentApiDTO.getAccountID())) {
            BasicDBList demoContent = demoDataApiClient.getLinkedContent(contentApiDTO.getUrl(),
                    new TypeReference<>() {});
            if (demoContent != null) {
                return new ContentApiResponse(null, 200, null,
                        null, demoContent);
            }
        }

        int poolSize = 1, timeout = 120000, maxPerRoute = 1;
        int cacheSize = 1;
        BasicDBObject dynamicData = new BasicDBObject();
        int cacheTimeout = 20;
        ContentApiManager.init(poolSize, timeout, maxPerRoute, cacheSize, cacheTimeout,
                TimeUnit.SECONDS);
        ContentApiResponse _contentAPIResponse =
                ContentApiManager.fetchTestApiCall(contentApiDTO, dynamicData);
        ContentApiManager.shutdown();
        return _contentAPIResponse;
    }


    @AccessFilterValue(access = Constants.ROOT, role = Constants.AccessRole.ADMIN,
            feature = campaign_integration_settings, subComponents = Integration,
            typeOfOperations = Write)
    public ActionForward saveContentAPI(ActionMapping mapping, ActionForm form,
            HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        BasicDBObject output = new BasicDBObject();

        User user = getUser(request);
        BasicDBObject source = null;
        source = getData(request);
        AccountMeta accountMeta = AccountMetaDao.instance.getAccountMeta();
        int accountId = Integer.parseInt(accountMeta.getAcct());
        if (source == null) {
            addSwalTexts(output, INVALID_REQUEST, REQUEST_PARSING_ERROR, ERROR);
            sendJsonResponse(request, response, output);
            return null;
        }

        source.append(ContentApiDTO.CREATEDBY, user.getLogin());
        source.append(ContentApiDTO.CREATEDON, (int) (System.currentTimeMillis() / 1000));

        int contentApiId = -1;
        String _id = source.getString(ContentApiDTO.CONTENTAPIID, null);

        String endpoint = source.getString(ContentApiDTO.ENDPOINT);
        try {
            ContentApiDTO dto = ContentApiDTO.getFromDBObject(accountId, source);
            endpoint = ContentApiParams.replacePathParams(dto, endpoint);
        } catch (Exception e) {
            addSwalTexts(output, INVALID_REQUEST, REQUEST_PARSING_ERROR, ERROR);
            CT_LOGGER.info(
                    "Trying to save invalid linked content api for Account ID = {}, URL = {}",
                    accountId, endpoint, e);
            sendJsonResponse(request, response, output);
            return null;
        }
        if (!validateEndpoint(endpoint, output, accountId, this.logger)) {
            sendJsonResponse(request, response, output);
            return null;
        }

        source.remove(ContentApiDTO.CONTENTAPIID);
        BasicDBList _labelLists = (BasicDBList) source.get(ContentApiDTO.LABELINFO);
        String sysLabel = findSystemLabel(_labelLists);
        if (sysLabel != null) {
            addSwalTexts(output, "Label" + sysLabel + "is used is a foo system label.",
                    "Please rename the label before saving", ERROR);
            sendJsonResponse(request, response, output);
            return null;
        }

        // check A Test Call Before Save
        ContentApiDTO testContentApiDTO = null;
        BasicDBObject _testSource = (BasicDBObject) source.copy();
        source.remove(TESTPARAMINFO); // Why removing testParamInfo
        modifiedParamList(_testSource);
        testContentApiDTO = ContentApiDTO.getFromDBObject(accountId, _testSource);
        ContentApiResponse contentApiResponse = null;
        try {
            contentApiResponse = testAPICall(testContentApiDTO);
            if (contentApiResponse.getJsonResponse() == null) {
                addSwalTexts(output, "API Response returned an error",
                        "Please ensure the response is accurate and does not return an error to save the namespace",
                        ERROR);
                sendJsonResponse(request, response, output);
                return null;
            }
        } catch (Exception e) {
            logger.error("exception while test api call when saving = {} ,for accountid={}", e,
                    accountId);
            addSwalTexts(output, RESPONSE_RETURNED_ERROR, "Internal server error,Please try again",
                    ERROR);
            sendJsonResponse(request, response, output);
            return null;
        }


        try {
            if (_id != null) {
                contentApiId = Integer.parseInt(_id);
                DynamicContentAPIDao.instance.remove(new BasicDBObject(ID, contentApiId));
            } else {
                // Check For Duplicate Namespace
                // if not an update operation
                String namespace = source.getString(ContentApiDTO.NAMESPACE);
                if (namespaceExists(namespace)) {
                    addSwalTexts(output, "API name already exists",
                            "Please choose another API name", ERROR);
                    sendJsonResponse(request, response, output);
                    return null;
                }
                contentApiId = (int) (System.currentTimeMillis() / 1000);
            }
            source.append(ID, contentApiId);
            DynamicContentAPIDao.instance.insert(source);

            // Save event only when new Namespace created
            if (_id == null) {
                BasicDBObject auth = (BasicDBObject) source.get("authInfo");
                String authType = auth != null && auth.size() > 0 ? "Basic auth" : "No auth";

                saveEvent(NAMESPACE_CREATED_EVENT,
                        new BasicDBObject()
                                .append(URL_TYPE_EVENT_PROP, testContentApiDTO.getMethod().name())
                                .append(AUTH_USES_EVENT_PROP, authType)
                                .append(URL_PERSONALISATION_USED,
                                        testContentApiDTO.getUrl().matches(PERSONALISED_URL_REGEX)),
                        user.getLogin());
            }
        } catch (MongoWriteException e) {
            if (!DBObjectUtil.isDuplicateKeyException(e)) {
                throw e;
            }
            logger.error("Duplicate Exception while saving linked content", e);
            addSwalTexts(output, "API name already exists", "Please choose another API name",
                    ERROR);
            sendJsonResponse(request, response, output);
            return null;
        } catch (Exception e) {
            logger.error("Exception while saving linked content", e);
            addSwalTexts(output, "Saving linked content failed",
                    "Failed to save the linked content to the database. Please try again", ERROR);
            sendJsonResponse(request, response, output);
            return null;
        }
        addSwalTexts(output, "Linked Content Saved!",
                "You'll be able to map this Linked Content in Campaigns along with liquid tags.",
                SUCCESS);
        sendJsonResponse(request, response, output);
        return null;
    }



    public boolean validateEndpoint(String endpoint, BasicDBObject output, int accountId,
            Logger logger) {
        final String invalidTitle = "Invalid Endpoint";
        final String invalidText = "Please enter a valid endpoint";

        if (endpoint == null || endpoint.isEmpty()) {
            addSwalTexts(output, invalidTitle, invalidText, ERROR);
            return false;
        }

        try {
            URL url = new URL(endpoint);
            if (StringUtil.isEmpty(url.getHost())) {
                addSwalTexts(output, invalidTitle, invalidText, ERROR);
                return false;
            }

            // this is protect any http interface live inside aws vpc to be queried from outside
            // like 169.254.169.254 (AWS cloud meta data server)
            if (!demoUtils.isDemo(accountId) && !WzrkUtils.isPublicUrl(endpoint)) {
                addSwalTexts(output, "Endpoint invalid - Not a Public Address",
                        "Please enter a valid endpoint to save", ERROR);
                return false;
            }
        } catch (Exception e) {
            addSwalTexts(output, invalidTitle, invalidText, ERROR);
            logger.error("invalid endpoint exception on save-{} for accountid={}", e, accountId);
            return false;
        }

        return true;
    }


}
