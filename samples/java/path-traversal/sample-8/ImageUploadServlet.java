import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.apache.commons.io.FileUtils;
import org.apache.tomcat.util.http.fileupload.disk.DiskFileItemFactory;

public class ImageUploadServlet extends HttpServlet {

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {

        DiskFileItemFactory factory = new DiskFileItemFactory();
        ServletFileUpload upload = new ServletFileUpload(factory);
        List<FileItem> formItems = upload.parseRequest(req);
        String albumId = formItems.get(0).getString();
        String fileName = formItems.get(1).getString();

        File albumsFolder = System.getConfiguration().getAlbumsFolder();
        File albumFolder = new File(albumsFolder, albumId);

        File imageFile = new File(albumFolder, fileName);
        FileUtils.copyInputStreamToFile(formItems.get(2).getInputStream(), imageFile);
    }
}
