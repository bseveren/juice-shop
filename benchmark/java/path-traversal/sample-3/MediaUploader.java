
import com.google.inject.Inject;
import java.io.File;
import java.io.FileOutputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.concurrent.ThreadLocalRandom;
import org.apache.commons.lang.StringUtils;
import org.apache.commons.lang3.tuple.ImmutablePair;
import org.apache.http.HttpEntity;
import org.apache.http.HttpHeaders;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.client.utils.URIBuilder;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.mime.MultipartEntityBuilder;
import org.apache.http.entity.mime.content.ContentBody;
import org.apache.http.entity.mime.content.FileBody;
import org.apache.http.entity.mime.content.StringBody;

public class WhatsAppMediaUploader {

    private final CTLogger ctLogger =
            CTLogger.make(WhatsAppMediaUploader.class, CTLogger.Feature.WHATSAPP);
    private WhatsAppCloudAPIManager whatsAppCloudAPIManager;

    private static final ContentBody text = new StringBody("whatsapp", ContentType.TEXT_PLAIN);
    @Inject
    private static NBConfig nbConfig;

    public WhatsAppMediaUploader(WhatsAppCloudAPIManager whatsAppCloudAPIManager) {
        this.whatsAppCloudAPIManager = whatsAppCloudAPIManager;
    }

    public String uploadMedia(String url, String fromNumberId, String accountId) {
        try {
            ImmutablePair<File, String> tempFilePair = downloadMediaFileFromUrl(url, accountId);
            if (tempFilePair == null) {
                return StringUtils.EMPTY;
            }
            String systemUserToken = getToken(accountId);

            WhatsAppCloudAPIResponse whatsAppCloudAPIResponse =
                    uploadMediaFileOnMeta(fromNumberId, tempFilePair, systemUserToken);

            // delete the temp file
            Files.deleteIfExists(Paths.get(tempFilePair.getKey().getAbsolutePath()));
            return getAssetIdFromResponse(whatsAppCloudAPIResponse);
        } catch (Exception e) {
            ctLogger.error(CTLogger.Priority.P2, "Error while uploading the media", e);
        }
        return StringUtils.EMPTY;
    }



    private WhatsAppCloudAPIResponse uploadMediaFileOnMeta(String fromNumberId,
            ImmutablePair<File, String> tempFilePair, String systemUserToken)
            throws URISyntaxException {
        URI uri = new URIBuilder().setScheme(SCHEME).setHost(FACEBOOK_GRAPH_API_ENDPOINT)
                .setPath(API_VERSION + SEPARATOR + fromNumberId + SEPARATOR
                        + "media")
                .build();

        HttpPost post = new HttpPost(uri);
        ContentBody cbFile = new FileBody(tempFilePair.getKey(),
                ContentType.create(tempFilePair.getValue()));

        MultipartEntityBuilder builder = MultipartEntityBuilder.create();
        builder.addPart("messaging_product", text);
        builder.addPart("type",
                new StringBody(tempFilePair.getValue(), ContentType.TEXT_PLAIN));
        builder.addPart("file", cbFile);

        post.setEntity(builder.build());
        post.setHeader(HttpHeaders.AUTHORIZATION, "Bearer " + systemUserToken);
        return whatsAppCloudAPIManager.fetchAPIResponse(post);
    }

    private ImmutablePair<File, String> downloadMediaFileFromUrl(String url, String accountId) {
        try (CloseableHttpResponse response =
                whatsAppCloudAPIManager.fetchMediaUsingTempURL(new HttpGet(url))) {
            if (response != null) {
                HttpEntity entity = response.getEntity();
                String mimeType = entity.getContentType().getValue();
                File directory = new File(nbConfig.getDataDirectory() + "/wa_media");
                if (!directory.exists()) {
                    directory.mkdir();
                }
                File tempFile =
                        File.createTempFile(ThreadLocalRandom.current().nextInt() + accountId,
                                "." + mimeType.split("/")[1], directory);
                try (FileOutputStream outStream = new FileOutputStream(tempFile)) {
                    entity.writeTo(outStream);
                }
                return new ImmutablePair<>(tempFile, mimeType);
            }
        } catch (Exception e) {
            ctLogger.error(CTLogger.Priority.P2, "error while downloading media " + url, e);
        }
        return null;
    }



}
