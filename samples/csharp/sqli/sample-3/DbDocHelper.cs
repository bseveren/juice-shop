namespace AcmeCorp.Core.SQLDataStorage
{
    /// <summary>
    /// Data storage operations for documents feature
    /// </summary>
    public sealed class DbDocHelper : DbHelperBase
    {
        #region Constructors
        /// <summary>
        ///
        /// </summary>
        /// <param name="connectionString">Connection string</param>
        public DbDocHelper(string connectionString)
            : base(connectionString)
        {
        }
        #endregion Constructors
        #region Operations
        /// <summary>
        ///
        /// </summary>
        /// <param name="UID"></param>
        /// <returns></returns>
        public int GetUnsignedDocumentsCount(string UID)
        {
            return UseConnectionCommand(command => GetUnsignedDocumentsCount_Internal(command, UID));
        }
        /// <summary>
        ///
        /// </summary>
        /// <param name="UID"></param>
        /// <returns></returns>
        private int GetUnsignedDocumentsCount_Internal(SqlCommand command, string UID)
        {
            command.Parameters.Clear();
            command.CommandText = "SELECT COUNT([id]) as [number_of_docs] FROM [DOCUMENTS] WITH (NOLOCK) WHERE [status] = @pStatus ";
            command.Parameters.AddWithValue("pStatus", (int)CoreDocument.StatusEnum.WaitingForSignature);
            if (!string.IsNullOrWhiteSpace(UID))
            {
                command.CommandText += "AND [uid] = @pUID";
                command.Parameters.AddWithValue("pUID", UID);
            }
            var queryResults = RunSqlQuery(command);
            return (int)queryResults.Rows[0]["number_of_docs"];

        }
        #endregion Operations
    }
}
