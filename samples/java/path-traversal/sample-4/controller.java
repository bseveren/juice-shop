
import android.text.TextUtils;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.Callable;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;


public class CTFeatureFlagsController {



    boolean isInitialized = false;

    final BaseAnalyticsManager mAnalyticsManager;

    final BaseCallbackManager mCallbackManager;

    FileUtils mFileUtils;



    String getCachedDirName() {
        return CTFeatureFlagConstants.DIR_FEATURE_FLAG + "_" + config.getAccountId();
    }




    private synchronized void archiveData(JSONObject featureFlagRespObj) {

        if (featureFlagRespObj != null) {
            try {
                mFileUtils.writeJsonToFile(getCachedDirName(), 'cache.json'),
                        featureFlagRespObj);
                getConfigLogger()
                        .verbose(getLogTag(), "Feature flags saved into file-[" + getCachedFullPath() + "]" + store);
            } catch (Exception e) {
                e.printStackTrace();
                getConfigLogger().verbose(getLogTag(), "ArchiveData failed - " + e.getLocalizedMessage());
            }
        }
    }

}
