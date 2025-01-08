namespace AcmeCorp.Core.SQLDataStorage
{
    /// <summary>
    /// Data storage operations for documents feature
    /// </summary>
    public sealed class DbDocTemplatesHelper : DbHelperBase
    {
        #region Constructors
        /// <summary>
        ///
        /// </summary>
        /// <param name="connectionString">Connection string</param>
        public DbDocTemplatesHelper(string connectionString)
            : base(connectionString)
        {
        }
        #endregion Constructors
        #region Operations
        /// <summary>
        /// Creates Document Template
        /// </summary>
        /// <param name="name">Template name</param>
        /// <param name="sourceType">Template source type</param>
        /// <param name="UID">UID</param>
        /// <returns></returns>
        public DocumentTemplate CreateDocumentTemplate(string name,
            DocumentTemplate.TemplateSourceTypeEnum sourceType, string UID = "")
        {
            return UseTransactionCommand(command => CreateDocumentTemplate_Internal(
                command, name, sourceType, UID));
        }
        private DocumentTemplate CreateDocumentTemplate_Internal(SqlCommand command, string name,
            DocumentTemplate.TemplateSourceTypeEnum sourceType, string UID = "")
        {
            if (string.IsNullOrWhiteSpace(UID))
                UID = "";
            command.Parameters.Clear();
            command.CommandText = "SELECT [id] FROM [DOCUMENTS_TEMPLATES] WITH (NOLOCK) WHERE [name] = @pName AND [is_active] = 1";
            command.Parameters.AddWithValue("pName", name);
            DataTable queryResults = RunSqlQuery(command);
            if (queryResults.Rows.Count > 0)
            {
                throw new DataStorageObjectAlreadyExistsException();
            }
            command.Parameters.Clear();
            command.CommandText = "INSERT INTO [DOCUMENTS_TEMPLATES] "
                + " ([edited_by_uid],[name],[source_type] "
                + "VALUES "
                + "(@pEditedByUID, @pName, @pSourceType) ";
            command.Parameters.AddWithValue("pEditedByUID", UID);
            command.Parameters.AddWithValue("pName", name);
            command.Parameters.AddWithValue("pSourceType", (int)sourceType);
            _ = RunSqlQuery(command);

            command.Parameters.Clear();
            command.CommandText = "SELECT TOP 1 [uid] FROM [DOCUMENTS_TEMPLATES] WITH (NOLOCK) WHERE [name] = @pName AND [is_active] = 1 ORDER BY [id] DESC";
            command.Parameters.AddWithValue("pName", name);
            queryResults = RunSqlQuery(command);
            if (queryResults.Rows.Count > 0)
            {
                return GetDocumentTemplateByUID(queryResults.Rows[0]["uid"].ToString());
            }
            return null;
        }
        #endregion Operations
    }
}
