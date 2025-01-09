using System.Data.SqlClient;
using System.Linq;
using Acme.Models;

namespace Acme.Repositories {
    public class EmployerRepository {
        public static EmployerModel? GetEmployerByClient(string user, string name, string vatNumber, string id)
        {
            using (var dbContext = new CreateDbContext())
            {
                SqlParameter userParameter = new SqlParameter("@APPUSER", user);
                SqlParameter nameParameter = new SqlParameter("@EmployerName", name);
                SqlParameter vatParameter = new SqlParameter("@VATNumber", System.Data.SqlDbType.VarChar);
                vatParameter.IsNullable = true;
                vatParameter.Value = (object)vatNumber ?? DBNull.Value;

                if (dbContext.Database.SqlQuery<bool>(
                    "SELECT dbo.DoesEmployerExistByClient(@APPUSER, @EmployerName, @VATNumber)",
                    userParameter, nameParameter, vatParameter).FirstOrDefault())
                {
                    return dbContext.Database.SqlQuery<EmployerModel>(
                        "SELECT * FROM Employers WHERE ExternalCode = '" + id + "'").FirstOrDefault();
                }
                else
                {
                    return null;
                }
            }
        }
    }
}
