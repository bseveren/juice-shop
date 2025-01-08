
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.PutObjectRequest;
import com.amazonaws.services.s3.model.S3Object;
import com.amazonaws.services.s3.model.S3ObjectInputStream;
import com.amazonaws.services.s3.transfer.TransferManager;
import com.amazonaws.services.s3.transfer.Upload;
import com.mongodb.BasicDBList;
import com.mongodb.BasicDBObject;
import java.io.BufferedOutputStream;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.zip.GZIPOutputStream;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.commons.io.FileUtils;
import org.apache.commons.lang.StringUtils;

public class CustomListSegmentJob extends BaseJob {

    private static final String TYPE_FIELD = "type";
    private static final String IDENTITY_FIELD = "identity";
    private static String bucketName;

    protected HashMap<Integer, GZIPOutputStream> writers;
    private ExecutorService exec = null;
    private final AtomicInteger notFoundCount = new AtomicInteger();

    public CustomListSegmentJob(CustomListSegmentDetail segmentDetail, AccountMeta accountMeta)
            throws IOException {
        this.segmentDetail = segmentDetail;
        this.accountMeta = accountMeta;
        this.pathToRawFileDir = DIR_PATH + accountMeta.getAcct() + DIR_SEPRATOR + segmentDetail._id
                + DIR_SEPRATOR + RAW_DIR + DIR_SEPRATOR;
        this.pathToProcessedFilesDir = DIR_PATH + accountMeta.getAcct() + DIR_SEPRATOR

    }



    public static void main(String[] args) throws Exception {

        if (args.length < 2 || !args[0].equals("-conf")) {

            String msg = "Usage: -conf conf.prod.json";
            System.err.println(msg);
            doLog(msg);
            System.exit(1);
        }
        try {
            initMongo(args[1]);

            Thread.sleep(5 * 1000L);
            System.exit(0); // normally exit
        } catch (Exception e) {
            doLog("Error in CustomListSegmentJob e-", e);
            Slack.slack("Error in CustomListSegmentJob e-" + e.getMessage(),
                    SlackChannel.SEGMENT_ALERTS, false);
            Thread.sleep(5 * 1000L);
            System.exit(1); // abnormal exit
        }
    }



}
