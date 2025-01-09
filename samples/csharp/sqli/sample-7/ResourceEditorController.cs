using System.Web;
using System.Web.Mvc;
using System.Web.Security;
using System.Data.SqlClient;


namespace Acme.Web.Controllers
{
    [Authorize]
    public class ResourceEditorController : Controller
    {
        private void SaveResource(string topic, string connectionString)
        {
            connectionString = connectionString + " initial catalog=" + EditorConnectionInformation.DATABASE_NAME + ";";

            HttpCookie authCookie = Request.Cookies[FormsAuthentication.FormsCookieName];
            int userId = 0;
            if (authCookie != null)
            {
                FormsAuthenticationTicket authTicket = FormsAuthentication.Decrypt(authCookie.Value);
                JavaScriptSerializer serializer = new JavaScriptSerializer();
                EditorPrincipalSerializationModel serializeModel = serializer.Deserialize<EditorPrincipalSerializationModel>(authTicket.UserData);
                userId = serializeModel.Id;
            }
            string date = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff", CultureInfo.InvariantCulture);

            try
            {

                using (SqlConnection conn = new SqlConnection(connectionString))
                {
                    conn.Open();
                    using (SqlCommand cmd = new SqlCommand("INSERT INTO Resource VALUES(" +
                                                                          "@UserID," +
                                                                          "@Date," +
                                                                          "@Layout," +
                                                                          "@Topic)" +
                                                                          "SELECT CAST(scope_identity() AS int)", conn))
                    {
                        cmd.Parameters.AddWithValue("@UserID", userId);
                        cmd.Parameters.AddWithValue("@Date", date);
                        cmd.Parameters.AddWithValue("@Layout", 1);
                        cmd.Parameters.AddWithValue("@Topic", topic);
                        int newID = (int)cmd.ExecuteScalar();
                    }
                }
            }

            catch (SqlException ex)
            {
                Acme.ExceptionManagement.ExceptionManager.Publish(ex);
                throw new Exception("error", ex);
            }
        }
    }
}
