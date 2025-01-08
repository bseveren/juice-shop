public class ResourceDBHelper
{
        public int InsertPageSentence(int pageSentenceOrdinal, int pageId, Sentence vs)
        {
            int sentenceId = 0;
            try
            {
                string connectionString = ConfigurationManager.ConnectionStrings["default"].ConnectionString;
                using (SqlConnection conn = new SqlConnection(connectionString))
                {
                    conn.Open();
                    using (SqlCommand cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = string.Format(@"
                                            INSERT INTO [{0}].[dbo].[Sentence]
                                            OUTPUT INSERTED.SentenceID
                                            Values ('{1}', {2})
                                ", Database.ConnectionInformation.DATABASE_NAME, Convert.ToInt32(vs.IsClosingSentence), 1);
                        sentenceId = (int)cmd.ExecuteScalar();

                        cmd.CommandText = string.Format(@"
                                            INSERT INTO [{0}].[dbo].[PageSentence]
                                            Values ({1}, {2}, {3}, {4})
                                ", Database.ConnectionInformation.DATABASE_NAME, pageId, sentenceId, pageSentenceOrdinal, 1);
                        cmd.ExecuteNonQuery();
                    }
                }
            }
        }
}
