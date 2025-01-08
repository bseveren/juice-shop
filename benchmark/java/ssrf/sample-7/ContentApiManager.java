package com.foo.contentapi;


import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;
import lombok.Getter;
import org.apache.commons.lang3.StringUtils;
import org.apache.http.Header;
import org.apache.http.HttpEntity;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.*;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.impl.conn.PoolingHttpClientConnectionManager;
import org.apache.http.pool.PoolStats;
import org.apache.http.util.EntityUtils;
import org.slf4j.Logger;

public class ContentApiManager {

    private static boolean mockMode = false;
    private static int mockModeApiLatencyMillis = 200;

    private static AccountLock lock = AccountLock.newInstance();
    private static PoolingHttpClientConnectionManager connManager = null;
    private static CloseableHttpClient client = null;
    private static ContentApiCache contentApiCache = null;
    private static final Logger logger = LoggerFactory.make();
    @Getter
    private static boolean init = false;

    @VisibleForTesting
    public static void setHttpClient(CloseableHttpClient httpClient) {
        client = httpClient;
    }


    /*
     * This is exclusively Used for Test Content-API on Dashboard Setting page
     */
    public static ContentApiResponse fetchTestApiCall(ContentApiDTO dto,
            BasicDBObject dynamicData) {
        HashMap<String, String> headerVals =
                ContentApiDTO.getStaticValues(dto.getHeaders(), dynamicData);
        HashMap<String, String> urlParamVals =
                ContentApiDTO.getStaticValues(dto.getUrlParams(), dynamicData);
        long start = System.currentTimeMillis();
        ContentApiResponse contentApiResponse = _fetch(dto, dynamicData, headerVals, urlParamVals);
        Profiler.report(
                "Content API acc : " + dto.getAccountID() + " contentID : " + dto.getContentApiID(),
                System.currentTimeMillis() - start);
        return contentApiResponse;
    }

    private static ContentApiResponse _fetch(ContentApiDTO dto, BasicDBObject dynamicData,
            HashMap<String, String> headerVals, HashMap<String, String> urlParamVals) {

        ContentApiDTO.MethodType method = dto.getMethod();
        URI uri;
        try {
            uri = ContentApiParams.handleParams(dto, urlParamVals);
        } catch (URISyntaxException e1) {
            return new ContentApiResponse(ContentApiError.ILLEGAL_URI, 0, null, null, null);
        } catch (Exception e) {
            Profiler.report(
                    "Got exception while replacing parameters for linked content api for Account ID = "
                            + dto.getAccountID() + ", URL = " + dto.getUrl() + ", Content api ID = "
                            + dto.getContentApiID(),
                    1, e);
            return new ContentApiResponse(ContentApiError.INVALID_CONTENT_API, 0, null, null, null);
        }

        HttpUriRequest request = null;
        CloseableHttpResponse response = null;
        ComplexValue cValPostBody = dto.getPostBody();
        String bodayVal = cValPostBody != null ? cValPostBody.getVal(dynamicData) : null;
        switch (method) {
            case POST:
                request = new HttpPost(uri);
                if (StringUtils.isNotBlank(bodayVal)) {
                    ((HttpPost) request)
                            .setEntity(new StringEntity(bodayVal.trim(), StandardCharsets.UTF_8));
                }
                break;
            case PUT:
                request = new HttpPut(uri);
                if (StringUtils.isNotBlank(bodayVal)) {
                    ((HttpPut) request)
                            .setEntity(new StringEntity(bodayVal.trim(), StandardCharsets.UTF_8));
                }
                break;
            case GET:
                request = new HttpGet(uri);
                break;
            default:
                return new ContentApiResponse(ContentApiError.ILLEGAL_URI, 0, null, null, null);
        }

        for (String key : headerVals.keySet()) {
            String val = headerVals.get(key);
            val = val.replace("\r", StringUtils.EMPTY).replace("\n", StringUtils.EMPTY);
            request.addHeader(key, val);
        }

        long start = System.currentTimeMillis();
        try {
            response = client.execute(request);
        } catch (Exception e) {
            Profiler.report("ContentApiManager fetchSync API_ERROR :" + dto.getAccountID()
                    + ", api id:" + dto.getContentApiID(), 1, e);
            return new ContentApiResponse(ContentApiError.API_ERROR, 0, null, null, null);
        } finally {
            Profiler.report("Content API call acc : " + dto.getAccountID() + " contentApiID : "
                    + dto.getContentApiID(), System.currentTimeMillis() - start);
        }

        return handleResponse(response, dto);
    }

}
