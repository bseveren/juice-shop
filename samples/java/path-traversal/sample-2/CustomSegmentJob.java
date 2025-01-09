
import com.amazonaws.services.s3.model.S3Object;
import com.mongodb.BasicDBList;
import com.mongodb.BasicDBObject;
import com.mongodb.ReadPreference;
import com.mongodb.ServerAddress;
import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.util.List;
import org.slf4j.Logger;

public class BaseJob {
    static {
        MongoDBObjectsInstrumentor.addToStringAsJsonSupport();
    }

    protected static final Logger logger = LoggerFactory.make();
    protected static final int BATCH_SIZE = 1000;
    protected static final String GUID_TYPE = "g";
    protected static final String IDENTITY_TYPE = "i";

    protected BaseJob() {

    }

    static {
        AppConstants.APP_CONTEXT = AppContext.POLLER;
    }

    protected static void initMongo(String c) throws Exception {

        StringBuilder configString;
        try (BufferedReader rd = new BufferedReader(new FileReader(c))) {
            String line;

            configString = new StringBuilder();
            while ((line = rd.readLine()) != null) {
                configString.append(line);
            }
        }

	}
}
