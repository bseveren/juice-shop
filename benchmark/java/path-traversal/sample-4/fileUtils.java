
import android.content.Context;
import android.text.TextUtils;
import androidx.annotation.NonNull;
import androidx.annotation.RestrictTo;
import androidx.annotation.RestrictTo.Scope;
import androidx.annotation.WorkerThread;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import org.json.JSONObject;

public class FileUtils {


    public void writeJsonToFile(String dirName,
            String fileName, JSONObject jsonObject) throws IOException {
        FileWriter writer = null;
        try {
            if (jsonObject == null || TextUtils.isEmpty(dirName) || TextUtils.isEmpty(fileName)) {
                return;
            }
            synchronized (FileUtils.class) {
                File file = new File(context.getFilesDir(), dirName);
                if (!file.exists()) {
                    if (!file.mkdir()) {
                        return;// if directory is not created don't proceed and return
                    }
                }

                File file1 = new File(file, fileName);
                writer = new FileWriter(file1, false);
                writer.append(jsonObject.toString());
                writer.flush();
            }
        } catch (Exception e) {
            e.printStackTrace();
            config.getLogger().verbose(config.getAccountId(),
                    "writeFileOnInternalStorage: failed" + e.getLocalizedMessage());
        }finally {
            if(writer != null){
                writer.close();
            }
        }
    }
}
