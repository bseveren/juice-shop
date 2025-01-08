
import com.mongodb.BasicDBList;
import com.mongodb.BasicDBObject;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.StringWriter;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang.StringUtils;
import org.apache.poi.util.TempFile;
import org.apache.struts.action.ActionForm;
import org.apache.struts.action.ActionForward;
import org.apache.struts.action.ActionMapping;
import org.apache.tika.Tika;

public class CatalogueAction extends BaseAction {

    private static final String ERROR_REASON = "error_reason";
    private static final String FILENAME = "filename";
    private static final String SUCCESS = "success";
    private static final String FAILURE = "failure";
    private static final String RESULT = "result";
    private static final String CATALOG = "catalog";
    private static final String CATALOG_ID = "catalogId";
    private static final String UTF8 = "UTF-8";
    private static final String REPLACEMENT_CANDIDATE = "replacement_candidate";
    private static final String CONFIRMED = "confirmed";
    private static final String IMPORTS_PROPERTIES = "imports_props";
    private static final String IMPORTED_PROPERTIES = "imported";
    private static final String IDENTITY = "identity";
    private static final String NAME = "name";
    private static final String IMAGE_URL = "imageurl";
    private static final String REPLACE = "replace";
    private static final int THROTTLE_DURATION = 60 * 5;


    @AccessFilterValue(feature = catalogs, subComponents = Catalogs, typeOfOperations = Write)
    public ActionForward uploadCatalogue(ActionMapping mapping, ActionForm form,
            HttpServletRequest request, HttpServletResponse response) throws IOException {
        if (checkIfAccountIsMarkedForMigration(request, response)) {
            return null;
        }
        request.setCharacterEncoding(UTF8);
        String accountId = AppConstants.ACCOUNT_ID.get();

        String catalogueId = request.getParameter(AbstractDao.ID);
        boolean replace = StringUtils.isNotBlank(catalogueId);
        boolean isLocationCatalog =
                Boolean.parseBoolean(request.getParameter(CatalogRequestDao.IS_LOCATION_CATALOG));

        if (!replace && CatalogueDao.getActiveCatalogCountToUpload(false,
                isLocationCatalog) >= CatalogueDao.MAX_CATALOGUES) {
            writeErrorJSON("Failed to upload catalog. Exceeded the number of uploads allowed.",
                    request, response);
            return null;
        }

        // to limit the user to use this method
        String dosKey = null;
        try {
            dosKey = AuthUtil.getIP(request);
        } catch (Exception t) {
            // Unknown - quit right away
            writeErrorJSON("IP address missing", request, response);
            return null;
        }
        // Acquire a permit
        try {
            DOSUtils.acquire(dosKey, THROTTLE_DURATION, DOSUtils.KeySuffix.UPLOAD_CATALOGUE);
        } catch (DosException.TooManyRequests e) {
            writeErrorJSON("Too many upload attempts. Try again in " + THROTTLE_DURATION / 60
                    + " minutes.", request, response);
            return null;
        }
        try {
            String catalogName = request.getParameter(CatalogueDao.NAME);
            boolean nameExists = CatalogueDao.instance.checkIfNameExists(catalogName);
            String fileName = request.getParameter(CatalogueDao.USER_FILENAME);
            if (fileName == null || StringUtils.isEmpty(fileName)) {
                writeErrorJSON("invalid catalog file name", request, response);
            }
            if (nameExists && !replace) {
                writeErrorJSON("Duplicate catalog name", request, response);
                return null;
            }

            File uploadedFile = TempFile.createTempFile(System.currentTimeMillis() + "-", fileName);
            OutputStream outStream = Files.newOutputStream(uploadedFile.toPath());
            try (OutputStreamWriter outWriter =
                    new OutputStreamWriter(outStream, StandardCharsets.UTF_8)) {
                IOUtils.copy(request.getInputStream(), outWriter, StandardCharsets.UTF_8);
            }
            String fileType = tika.detect(uploadedFile);
            ctLogger.info("Uploading Catalogue of file type : {} ", fileType);
            if (!ALLOWED_FILETYPES.contains(fileType)) {
                Files.deleteIfExists(Paths.get(uploadedFile.getAbsolutePath()));
                writeErrorJSON(fileType + " is not a valid file type", request, response);
                return null;
            }

        } catch (Exception e) {
            logger.info("CatalogS3: error in  updating catalog, e: " + e);
            Slack.slack("CatalogS3: error in  updating catalog for account id " + accountId,
                    Slack.SlackChannel.DS_ALERTS, false);
            writeErrorJSON("Error in saving file", request, response);
        }

        return null;

    }



}
