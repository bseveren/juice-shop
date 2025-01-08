import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

public class RequestProcessor {

    public void handle(HttpServletRequest req, HttpServletResponse httpServletResponse)
            throws IOException {
        String uri = req.getRequestURI();

        switch (uri) {
            case "/health":
                return respond(HealthUtils.getHealth().toString(), httpServletResponse, SC_OK);
            case "/status":
                return respond(HealthUtils.getStatus().toString(), httpServletResponse, SC_OK);
            case "/download":
                String name = req.getParameter("n");
                if (name.isBlank()) {
                    return respondBadRequest(null, httpServletResponse);
                }
                final File directory = new File(Config.REPORT_FILE_DOWNLOAD_DIR);
                File reqReport = new File(directory, name);

                // Only allow files inside the report download directory to be downloaded.
                if (!reqReport.getCanonicalPath()
                        .startsWith(directory.getCanonicalPath() + File.separator)) {
                    return respondBadRequest(null, httpServletResponse);
                }
                if (!reqReport.exists()) {
                    return respondBadRequest(null, httpServletResponse);
                }

                httpServletResponse.setContentType("application/octet-stream");
                httpServletResponse.setContentLength((int) reqReport.length());
                httpServletResponse.setHeader("Content-Disposition", reqReport.getName());
                try (OutputStream outStream = httpServletResponse.getOutputStream()) {
                    byte[] buffer = new byte[1024 * 100];
                    int bytesRead;
                    try (FileInputStream fis = new FileInputStream(reqReport)) {
                        while ((bytesRead = fis.read(buffer)) != -1) {
                            outStream.write(buffer, 0, bytesRead);
                        }
                    }
                }
        }
    }
}
