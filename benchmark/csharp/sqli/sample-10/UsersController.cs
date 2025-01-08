public class UsersController : ApiController
{
    public enum SortingField
    {
        NAME,
        EMAIL,
        TYPE
    }

    [HttpGet]
    [TokenAuth]
    [AuthorizeClaims(Entity = AuthorizationEntity.User, Permission = PermissionType.Read)]
    [Route("api/v3/users/search")]
    [ResponseType(typeof(PagedResult<UserSearchDto>))]
    public async Task<IHttpActionResult> SearchUsers([FromUri] string filter,
        [FromUri] int page, [FromUri(Name = "sort_by")] SortingField sortBy = SortingField.NAME,
        [FromUri] SortingDirection sort = SortingDirection.ASC, [FromUri(Name = "page_size")] int pageSize = 25)
    {
        var currentUserId = ClaimRetriever.Retrieve(User, Claims.Id);
        var users = new LinkedList<UserSearchDto>();

        string connectionString = new AdvancedDatabaseOpsService().GetConnectionString();
        using (SqlConnection connection = new SqlConnection(connectionString))
        {
            await connection.OpenAsync();
            using (SqlCommand cmd = new SqlCommand(
                "SELECT * FROM dbo.SearchUsers(@TextFilter) " +
                $"WHERE Id != @CurrentUserId " +
                $"ORDER BY {UserSearchSortStatement(sort, sortBy)} " +
                $"OFFSET @Offset ROW FETCH NEXT @PageSize ROWS ONLY;", connection))
            {
                cmd.CommandType = CommandType.Text
                cmd.Parameters.AddWithValue("@TextFilter", filter);
                cmd.Parameters.AddWithValue("@CurrentUserId", currentUserId);
                cmd.Parameters.AddWithValue("@Offset", (page - 1) * pageSize);
                cmd.Parameters.AddWithValue("@PageSize", pageSize);

                using (SqlDataReader reader = await cmd.ExecuteReaderAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        users.AddLast(reader.MapToObject<UserSearchDto>());
                    }
                }
            }

        }

        return Ok(new PagedResult<UserSearchDto>
        {
            Page = page,
            PageSize = pageSize,
            Elements = users
        });
    }

    private string UserSearchSortStatement(SortingDirection sortingDirection,
        SortingField sortingField)
    {
        switch (sortingField)
        {
            case SortingField.NAME:
                return "FirstName + ' ' + LastName" + (sortingDirection == SortingDirection.ASC ? " ASC" : " DESC");
            case SortingField.TYPE:
                return "Type" + (sortingDirection == SortingDirection.ASC ? " ASC" : " DESC");
            case SortingField.EMAIL:
                return "Email" + (sortingDirection == SortingDirection.ASC ? " ASC" : " DESC");
        }

        throw new Exception("Sorting not supported");
    }
}
