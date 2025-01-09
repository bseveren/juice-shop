import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.apache.commons.io.IOUtils;

public class ZipDownloadServlet extends HttpServlet implements PluginServlet {

    @Override
    public void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException {
        String token = request.getParameter("token");
        Claims claims = new AccessTokens().parse(token);
        String orgId = claims.get("organisationId", String.class);
        String reportUid = claims.get("reportUid", String.class);
        HttpSecurityAssertions.assertLegitInput(orgId);
        HttpSecurityAssertions.assertLegitInput(reportUid);

        Path zipFolder = Paths.get(System.getConfiguration().getTempZipFolder());
        File zipFile = zipFolder
                .resolve(orgId)
                .resolve(reportUid + ".zip").toFile();
        try (FileInputStream fis = new FileInputStream(zipFile)) {
            response.setContentType("application/octet-stream");
            response.addHeader("Content-Disposition", "attachment; filename=" + reportUid + ".zip");
            response.addHeader("X-Content-Type-Options", "nosniff");
            response.setStatus(HttpServletResponse.SC_OK);
            IOUtils.copy(fis, response.getOutputStream());
            response.flushBuffer();
        } catch (Exception ex) {
            response.sendError(500, "Failed sending zip");
        } finally {
            zipFile.getParentFile().delete();
        }
    }
}
