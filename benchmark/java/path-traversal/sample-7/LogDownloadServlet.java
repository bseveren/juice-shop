import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

public class LogDownloadServlet extends HttpServlet {

	@Override
	protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
		resp.setStatus(HttpServletResponse.SC_OK);
		resp.setHeader("Content-disposition", "attachment; filename=" + fileName + ".zip");

		String fileName = req.getParameter("fileName");
		File file = new File("log/", fileName);

		FileInputStream in = null;
		ZipOutputStream zipOut = null;
		try {
			zipOut = new ZipOutputStream(resp.getOutputStream());
			ZipEntry zipEntry = new ZipEntry(file.getName());
			zipOut.putNextEntry(zipEntry);
			in = new FileInputStream(file);
			byte[] buffer = new byte[4096];
			int length;
			while ((length = in.read(buffer)) > 0) {
				zipOut.write(buffer, 0, length);
			}
		} finally {
			in.close();
			zipOut.close();
		}
	}
}
