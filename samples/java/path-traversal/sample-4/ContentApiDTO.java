
import com.mongodb.BasicDBList;
import com.mongodb.BasicDBObject;
import java.nio.charset.StandardCharsets;
import java.util.*;
import lombok.Getter;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.collections4.MapUtils;
import org.apache.commons.lang.StringUtils;
import org.apache.http.HttpHeaders;
import org.slf4j.Logger;

public class ContentApiDTO {

    private static final Logger logger = LoggerFactory.make();
    public static final String NAMESPACE = "name";
    public static final String HTTP_METHOD = "method";
    public static final String ENDPOINT = "url";
    public static final String AUTHINFO = "authInfo";
    public static final String BASICAUTHPASSWORD = "p";
    public static final String BASICAUTHUSER = "u";
    public static final String BODYINFO = "bodyInfo";
    public static final String BODYVAL = "bodyVal";
    public static final String MANDATORYVAL = "m";
    public static final String HEADERSINFO = "headerInfo";
    public static final String HEADERKEY = "headerKey";
    public static final String HEADERVALUE = "headerVal";
    public static final String PARAMSINFO = "paramInfo";
    public static final String PARAMKEY = "paramKey";
    public static final String PARAMVAL = "paramVal";
    public static final String PARAMTYPE = "paramType";
    public static final String PATH = "PATH";
    public static final String QUERY = "QUERY";
    public static final String LEGACY = "LEGACY";
    public static final String LABELINFO = "labelInfo";
    public static final String LABELKEY = "labelKey";
    public static final String LABELVALUE = "labelVal";
    public static final String CONTENTAPIID = "_id";
    public static final String STATUS = "status";
    public static final String CREATEDBY = "created-by";
    public static final String CREATEDON = "created-on";

    public enum MethodType {
        GET, POST, PUT
    }

    private final int contentApiID;
    private final int accountID;
    private final String url;
    private final HashMap<String, ComplexValue> headers;
    private final HashMap<String, ComplexValue> urlParams;
    private final MethodType method;
    private final ComplexValue postBody;
    private final HashMap<String, String> labelInfo;
    private final String namespace;
    private boolean isValid;
    private boolean status = true;


    public static final HashSet<String> KNOWN_LABEL_KEYS = new HashSet<>();
    public static final String JSON_LABEL = "json";
    public static final String STATUS_CODE_LABEL = "http_status_code";
    public static final String RAW_LABEL = "raw";
    public static final String HEADERS_LABEL = "headers";

    static {
        KNOWN_LABEL_KEYS.add(JSON_LABEL);
        KNOWN_LABEL_KEYS.add(STATUS_CODE_LABEL);
        KNOWN_LABEL_KEYS.add(RAW_LABEL);
        KNOWN_LABEL_KEYS.add(HEADERS_LABEL);
    }

    public ContentApiDTO(int accountID, int contentApiID, String namespace, String url,
            MethodType method, HashMap<String, ComplexValue> headers,
            HashMap<String, ComplexValue> urlParams, ComplexValue body,
            HashMap<String, String> labelInfo) {
        this.accountID = accountID;
        this.contentApiID = contentApiID;
        this.namespace = namespace;
        this.url = url;
        this.method = method;
        this.headers = headers;
        this.urlParams = urlParams;
        this.postBody = body;
        this.labelInfo = labelInfo;

        validate();
    }



    public int getAccountID() {
        return accountID;
    }

    public boolean isValid() {
        return isValid;
    }



}
