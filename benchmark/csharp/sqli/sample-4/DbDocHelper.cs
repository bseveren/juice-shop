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
        /// Set is_active to 0 for documents with given name and process id.
        /// </summary>
        /// <param name="command">Sql command</param>
        /// <param name="processId">Process ID</param>
        /// <param name="fileName">File name</param>
        private void InvalidateProcessDocuments(SqlCommand command, int processId, string fileName)
        {
            command.Parameters.Clear();
            command.CommandText = "UPDATE [DOCUMENTS] SET " +
                "[is_active] = 0 " +
                "WHERE [process_id] = @pProcessId " +
                "AND [file_name] = @pFileName";
            command.Parameters.AddWithValue("pProcessId", processId);
            command.Parameters.AddWithValue("pFileName", fileName);
            _ = RunSqlQuery(command);
        }
        #endregion Operations
    }
}
