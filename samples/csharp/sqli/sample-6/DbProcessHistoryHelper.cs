namespace AcmeCorp.Core.SQLDataStorage
{

    /// <summary>
    ///
    /// </summary>
    public sealed class DbProcessHistoryHelper : DbHelperBase
    {
        public string GetProcessHistoryLatestIP(int processId, SystemUserTypeEnum sourceUserType)
        {
            return UseConnectionCommand(command => GetProcessHistoryLatestIP_Internal(command, processId, sourceUserType));
        }
        private string GetProcessHistoryLatestIP_Internal(
            SqlCommand command, int processId, SystemUserTypeEnum sourceUserType)
        {
            string modifiedBy = ApiRequestContext.UserTypeAsString(sourceUserType);
            if (string.IsNullOrWhiteSpace(modifiedBy))
            {
                return null;
            }
            command.Parameters.Clear();
            command.CommandText = "SELECT [remote_ip] FROM [PROCESS_HISTORY] WITH (NOLOCK) WHERE " +
                "[process_id] = @pProcessId AND [is_active] = 1 AND [modified_by] = @pModifiedBy " +
                "ORDER BY [create_date] DESC";
            command.Parameters.AddWithValue("pProcessId", processId);
            command.Parameters.AddWithValue("pModifiedBy", modifiedBy);
            var queryResults = RunSqlQuery(command);
            if (queryResults.Rows.Count > 0)
            {
                return GetStringColumnValue(queryResults.Rows[0]["remote_ip"]);
            }
            return null;
       }
    }
}
