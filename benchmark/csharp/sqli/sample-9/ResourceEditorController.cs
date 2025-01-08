[Authorize]
public class VocabularyEditorController : Controller
{
    private DataTable RetrieveTests(List<int> ids)
    {
        DataTable result = new DataTable();
        try
        {
            string connectionString = ConfigurationManager.ConnectionStrings["default"].ConnectionString;
            using (SqlConnection conn = new SqlConnection(connectionString))
            {
                string selected = string.Format(@"
                SELECT TQ.TestID, TQ.WordID, TQ.IsActive, T.LessonID, T.TestTypeID
                FROM [{0}].[dbo].[TestQuestion] AS TQ
                INNER JOIN [{0}].[dbo].[Test] as T
                ON T.TestID = TQ.TestID
                WHERE TQ.TestID IN ({1})
                ", VocabularyDatabase.VocabularyConnectionInformation.DATABASE_NAME, string.Join(",", ids));
                using (SqlCommand cmd = new SqlCommand(selected, conn))
                {
                    SqlDataAdapter da = new SqlDataAdapter(cmd);
                    da.Fill(result);
                }
                return result;
            }
        }
    }
}
