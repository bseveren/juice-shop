
import ch.qos.logback.classic.Level;
import com.mongodb.BasicDBList;
import com.mongodb.BasicDBObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UnsupportedEncodingException;
import java.net.SocketException;
import java.net.SocketTimeoutException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.util.Map.Entry;
import java.util.UUID;
import java.util.zip.GZIPOutputStream;
import javax.servlet.http.HttpServletResponse;
import org.apache.commons.io.IOUtils;
import org.apache.http.HttpEntity;
import org.apache.http.NoHttpResponseException;
import org.apache.http.StatusLine;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.config.SocketConfig;
import org.apache.http.entity.AbstractHttpEntity;
import org.apache.http.entity.ByteArrayEntity;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.impl.conn.PoolingHttpClientConnectionManager;
import org.apache.http.util.EntityUtils;
import org.slf4j.Logger;

public class ClientSync {

    public static final String HTTP_PREFIX = "http://";

    static {
        WzrkUtils.setLogging(Level.WARN);
    }

    private static PoolingHttpClientConnectionManager cm;
    protected static CloseableHttpClient client;

    private static String CONTENT_TYPE = "Content-type";
    private static String CONTENT_TYPE_BINARY = "application/octet-stream";
    private static String CONTENT_TYPE_FORM_POST = "application/x-www-form-urlencoded";

    private static Logger logger = org.slf4j.LoggerFactory.getLogger(ClientSync.class);

    public static final String TRUE = "1";

    private static int timeout;



    public static final String META_TS = "ts", META_EVENT_PROPERTIES = "ep";

    public static byte[] query(String host, BasicDBObject query, String account) {
        return query(host, query, account, null);
    }

    public static byte[] query(String host, BasicDBObject query, String account,
            BasicDBObject parmas) {
        checkSync();
        StringEntity entity;
        int status = -1;
        int retries = 3;
        CloseableHttpResponse response = null;
        query.append(QueryConstants.APP_CONTEXT, AppConstants.APP_CONTEXT.ordinal());
        query.append(QueryConstants.QUERY_ID_KEY, UUID.randomUUID().toString());

        while (retries-- > 0) {
            entity = new StringEntity(query.toString(), StandardCharsets.UTF_8);

            StringBuilder url = new StringBuilder(HTTP_PREFIX);
            url.append(host).append("/q?");
            url.append('a').append("=").append(account);
            if (parmas != null) {
                for (Entry<String, Object> e : parmas.entrySet()) {
                    url.append("&" + e.getKey()).append("=").append(e.getValue().toString());
                }
            }

            HttpPost post = new HttpPost(url.toString());

            if (entity != null) {
                post.setEntity(entity);
            }

            try {
                response = client.execute(post);

                StatusLine sl = response.getStatusLine();

                status = sl.getStatusCode();

                if (status != HttpServletResponse.SC_OK) {

                    throw new RuntimeException(
                            "Error: Eventstore responded with status : " + status);

                } else {

                    InputStream inputStream = response.getEntity().getContent();
                    byte[] bytes = IOUtils.toByteArray(inputStream);

                    return bytes;
                }
            } catch (Throwable e) {

                // logger.error("Eventstore: " + host + " is not available ", e);

                if (e instanceof NoHttpResponseException) {
                    try {
                        Profiler.report("Event store stale connection", 0);
                        Thread.sleep(1000);
                    } catch (InterruptedException ignored) {

                    }
                    if (retries > 0) {
                        continue;
                    }
                }
                throw new RuntimeException("Exception while posting to eventstore", e);

            } finally {

                if (response != null) {
                    HttpEntity en = response.getEntity();

                    try {
                        /* consume the response */
                        EntityUtils.consume(en);
                    } catch (Throwable e) {
                    }

                    /* finally, close the closable */
                    try {
                        response.close();
                    } catch (Throwable t) {
                    }

                }
            }
        }

        return null;

    }



}
