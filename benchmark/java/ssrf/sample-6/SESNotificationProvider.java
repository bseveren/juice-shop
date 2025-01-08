
import com.google.common.annotations.VisibleForTesting;
import com.mongodb.BasicDBList;
import com.mongodb.BasicDBObject;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.security.PublicKey;
import java.security.Signature;
import java.security.SignatureException;
import java.security.cert.CertificateException;
import java.security.cert.CertificateFactory;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Scanner;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import javax.servlet.http.HttpServletRequest;
import org.apache.commons.lang.StringUtils;
import org.apache.commons.net.util.Base64;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;

public class SESNotificationProvider implements IEmailCallbackProvider {

    private static final String COMPLAINT_EVENT_TYPE = "Complaint";
    private static final String BOUNCE_EVENT_TYPE = "Bounce";
    private static final String EVENT_TYPE = "notificationType";
    protected static final String COMPLAINT_OBJECT = "complaint";
    private static final String KEY_NAME = "name";
    private static final String KEY_VALUE = "value";
    private static final String DIAGNOSTIC_CODE = "diagnosticCode";

    @VisibleForTesting
    protected CTLogger ctLogger =
            CTLogger.make(SESNotificationProvider.class, CTLogger.Feature.EMAIL);

    private static final ThreadPoolExecutor activationExecutor =
            new ThreadPoolExecutor(10, 10, 0L, TimeUnit.MILLISECONDS, new SynchronousQueue<>(),
                    new ThreadPoolExecutor.DiscardPolicy());

    public List<BounceEntity> toWzrkFormat(HttpServletRequest req) {

        String accountId = req.getParameter(IEmailCallbackProvider.AUTH_PARAM);
        BasicDBObject amazonPayload, messagePayload;
        int accId = AccountsUtil.decodeAccountId(accountId);

        try {
            String line = StringUtil.readAsString(req.getInputStream());
            amazonPayload = BasicDBParser.parseBasicDBObject(line);

            if (amazonPayload == null) {
                return null;
            }
            String payloadType = amazonPayload.getString("Type");
            if ("SubscriptionConfirmation".equals(payloadType)) {
                activationExecutor.submit(() -> handleSesActivation(amazonPayload));
                return Collections.emptyList();
            }

            Object message = amazonPayload.getOrDefault("Message", null);
            if (message == null) {
                return null;
            }

            if (message instanceof BasicDBObject) {
                messagePayload = (BasicDBObject) message;
            } else {
                messagePayload = BasicDBParser.parseBasicDBObject((String) message);
            }
            if (messagePayload == null) {
                return null;
            }

            BasicDBObject mail =
                    (BasicDBObject) messagePayload.getOrDefault("mail", new BasicDBObject());
            if (mail.isEmpty()) {
                return new ArrayList<>();
            }

            BasicDBList headersList = (BasicDBList) mail.getOrDefault("headers", new BasicDBList());
            String meta = null;
            BasicDBObject metadata = new BasicDBObject();
            for (Object obj : headersList) {
                BasicDBObject headerObj = (BasicDBObject) obj;

                if (SMTP.METADATA_HEADER.equals(headerObj.get(KEY_NAME))) {
                    metadata = BasicDBObject.parse(headerObj.getString(KEY_VALUE));
                }
            }
            if (meta == null) {
                return new ArrayList<>();
            }

            String eventType = messagePayload.getString(EVENT_TYPE, "");
            switch (eventType) {
                case COMPLAINT_EVENT_TYPE:
                    return processSpamMessage(messagePayload, meta, accId, metadata);
                case BOUNCE_EVENT_TYPE:
                    return processBounceMessage(messagePayload, meta, accId, metadata);
                default:
                    return new ArrayList<>();
            }
        } catch (Exception e) {
            Profiler.report(
                    "Exception occurred in SESNotificationProvider for account: " + accountId, 1, e,
                    1);
            return new ArrayList<>();
        }
    }

    protected List<BounceEntity> processBounceMessage(BasicDBObject messagePayload, String meta,
            int accId, BasicDBObject metadata) {
        try {
            BasicDBObject bounce = (BasicDBObject) messagePayload
                    .getOrDefault(IEmailCallbackProvider.BOUNCE, new BasicDBObject());
            if (bounce.isEmpty()) {
                return new ArrayList<>();
            }

            logger.info("AMAZON SES callback bounce message : " + messagePayload);
            String bounceType = bounce.getString(IEmailCallbackProvider.BOUNCE_TYPE, null);
            BounceType bt;
            if (bounceType != null && bounceType.equals(IEmailCallbackProvider.PERMANENT)) {
                bt = BounceType.EmailWithMetaHard;
            } else {
                bt = BounceType.EmailWithMetaSoft;
            }

            BasicDBList bouncedRecipients = (BasicDBList) bounce
                    .getOrDefault(IEmailCallbackProvider.BOUNCE_RECIPIENTS, new BasicDBList());

            return getEntitiesForRecipients(bouncedRecipients, meta, accId, bt, metadata);
        } catch (Exception e) {
            Profiler.report("Exception occurred in processBounceMessage for account: " + accId, 1,
                    e, 1);
            return new ArrayList<>();
        }
    }

    protected List<BounceEntity> processSpamMessage(BasicDBObject messagePayload, String meta,
            int accId, BasicDBObject metadata) {
        if (!messagePayload.containsField(COMPLAINT_OBJECT)) {
            return new ArrayList<>();
        }

        try {
            BasicDBObject complaint = (BasicDBObject) messagePayload.getOrDefault(COMPLAINT_OBJECT,
                    new BasicDBObject());
            if (complaint.isEmpty()) {
                return new ArrayList<>();
            }

            BasicDBList complaintRecipients = (BasicDBList) complaint
                    .getOrDefault(IEmailCallbackProvider.COMPLAINT_RECIPIENTS, new BasicDBList());
            return getEntitiesForRecipients(complaintRecipients, meta, accId, BounceType.EMAIL_SPAM,
                    metadata);
        } catch (Exception e) {
            Profiler.report("Exception occurred in proccessSpamMessage for account: " + accId, 1, e,
                    1);
            return new ArrayList<>();
        }
    }

    protected List<BounceEntity> getEntitiesForRecipients(BasicDBList recipients, String meta,
            int accId, BounceType bt, BasicDBObject metadata) {
        List<BounceEntity> list = new ArrayList<>();
        try {
            for (Object obj : recipients) {
                BasicDBObject emObj = (BasicDBObject) obj;
                BounceEntity be;
                String emailAddr = emObj.getString("emailAddress", "");
                be = MessageUtil.getBounceEntityFromMeta(bt, meta, accId, emailAddr);
                if (be != null) {
                    list.add(be);
                }

                if (bt != BounceType.EMAIL_SPAM && bt != BounceType.EmailWithMetaHard
                        || StringUtil.isEmpty(emailAddr) || be == null) {
                    continue;
                }

                long iid = metadata.getLong(SMTP.IID_HEADER, 0);
                long idn = metadata.getLong(SMTP.IDN_HEADER, 0);
                int targetID = metadata.getInt(SMTP.TARGET_ID_HEADER, 0);
                String pivot = metadata.getString(SMTP.PIVOT_HEADER, "");
                UnsubscriptionEventContainer container =
                        new UnsubscriptionEventContainer(iid, idn, UnsubscriptionChannel.EMAIL,
                                emailAddr, targetID, UnsubscriptionType.getTypeFromBounce(bt))
                                        .withPivotInfo(pivot);

                if (emObj.containsField(DIAGNOSTIC_CODE)) {
                    container.withReason(emObj.getString(DIAGNOSTIC_CODE, ""));
                }

                EmailSubscriptionServlet.changeSubscription(accId, be, container);
            }
        } catch (Exception e) {
            Profiler.report("Exception occurred in getEntitiesForRecipients for account: " + accId,
                    1, e, 1);
        }

        return list;
    }

    @VisibleForTesting
    protected void handleSesActivation(BasicDBObject payload) {
        PublicKey publicKey = getPublicKey(payload.getString("SigningCertURL", ""));
        if (publicKey == null) {
            return;
        }

        String stringToHash = getStringToHash(payload);

        String signatureVersion = payload.getString("SignatureVersion");
        String hashAlgorithm = getHashAlgorithm(signatureVersion);
        try {
            String signature = payload.getString("Signature");
            byte[] decodedSignatureBytes = Base64.decodeBase64(signature);
            Signature signatureCreated = createSignatureForAlgorithm(hashAlgorithm);
            boolean verified = verifyIfSignatureValid(signatureCreated, publicKey, stringToHash,
                    decodedSignatureBytes);
            ctLogger.info("Signature verification status = " + verified);
            if (verified) {
                String subscribeUrl = payload.getString("SubscribeURL");
                visitUrl(subscribeUrl);
            }
        } catch (Exception e) {
            ctLogger.error(CTLogger.Priority.P1, "Error while verifying subscription", e);
        }
    }

    private void visitUrl(String subscribeUrl) {
        try (CloseableHttpClient client = HttpClients.createDefault()) {
            client.execute(new HttpGet(subscribeUrl));
        } catch (Exception e) {
            ctLogger.error(CTLogger.Priority.P1,
                    "Error while visiting SubscribeURL = " + subscribeUrl, e);
        }
    }

    protected String getHashAlgorithm(String signatureVersion) {
        return switch (signatureVersion) {
            case "1" -> "SHA1withRSA";
            case "2" -> "SHA256withRSA";
            default -> null;
        };
    }

    protected String getStringToHash(BasicDBObject payload) {
        // Do NOT change the order of these keys:
        // https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message.html
        List<String> keysInMessage = Arrays.asList("Message", "MessageId", "SubscribeURL",
                "Timestamp", "Token", "TopicArn", "Type");
        StringBuilder stringToHashBuilder = new StringBuilder();
        keysInMessage.forEach(key -> stringToHashBuilder.append(key).append("\n")
                .append(payload.getString(key)).append("\n"));
        return stringToHashBuilder.toString();
    }

    protected boolean verifyIfSignatureValid(Signature signature, PublicKey publicKey,
            String stringToHash, byte[] decodedSignatureBytes)
            throws InvalidKeyException, SignatureException {
        signature.initVerify(publicKey);
        signature.update(stringToHash.getBytes());
        return signature.verify(decodedSignatureBytes);
    }

    protected PublicKey getPublicKey(String certificateUrl) {
        try {
            if (!isValidCertificateUrl(certificateUrl)) {
                ctLogger.error(CTLogger.Priority.P1,
                        "The certificate URL " + certificateUrl + " is not valid");
                return null;
            }
            String certificateContents = getCertificateContents(certificateUrl);
            return CertificateFactory.getInstance("X.509")
                    .generateCertificate(new ByteArrayInputStream(certificateContents.getBytes()))
                    .getPublicKey();
        } catch (CertificateException | SecurityException | IOException exception) {
            ctLogger.error(CTLogger.Priority.P1,
                    "Error while getting certificate for signature verification", exception);
            return null;
        }
    }

    @VisibleForTesting
    protected boolean isValidCertificateUrl(String certificateUrl) throws MalformedURLException {
        if (StringUtils.isBlank(certificateUrl)) {
            return false;
        }
        URL url = new URL(certificateUrl);
        return url.getProtocol().equals("https") && url.getHost().startsWith("sns.")
                && url.getHost().endsWith(".amazonaws.com");
    }

    protected String getCertificateContents(String certificateUrl) throws IOException {
        String certificateContents;
        try (Scanner scanner = new Scanner(new URL(certificateUrl).openStream())) {
            certificateContents = scanner.useDelimiter("\\A").next();
        }
        return certificateContents;
    }

    protected Signature createSignatureForAlgorithm(String hashAlgorithm)
            throws NoSuchAlgorithmException {
        return Signature.getInstance(hashAlgorithm);
    }
}
