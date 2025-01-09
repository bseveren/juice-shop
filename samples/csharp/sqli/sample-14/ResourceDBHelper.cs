public class ResourceDBHelper
{
    public int UpdateStory(Story story)
    {
        int result = 0;
        string connectionString = ConfigurationManager.ConnectionStrings["default"].ConnectionString;
        using (SqlConnection conn = new SqlConnection(connectionString))
        {
            conn.Open();
            using (SqlCommand cmd = conn.CreateCommand())
            {
                cmd.CommandText = string.Format(@"
                                    UPDATE [{0}].[dbo].[Story]
                                    Set Title = '{1}', Ordinal = {2}, IsActive = {3}
                                    WHERE StoryID = {4}
                        ", Database.ConnectionInformation.DATABASE_NAME, story.Title, story.Ordinal, 1, story.StoryID);

                result = cmd.ExecuteNonQuery();
                return result;
            }
        }
    }
}
