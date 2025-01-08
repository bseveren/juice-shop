using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;

public class DashboardService
{
    private readonly MetadataContext metadataContext;

    public DashboardService(MetadataContext context)
    {
        metadataContext = context;
    }

    public List<DashboardWidgetDataOverviewDto> GetDashboardWidgetDataOverview()
    {
            var query = $@"
                SELECT
                    [D].[{nameof(DashboardWidgetData.Guid)}] AS [{nameof(DashboardWidgetDataOverviewDto.Guid)}],
                    [U].[{nameof(aspnet_Users.UserId)}] AS [{nameof(DashboardWidgetDataOverviewDto.UserId)}],
                    [U].[{nameof(aspnet_Users.UserName)}] AS [{nameof(DashboardWidgetDataOverviewDto.UserName)}],
                    [D].[{nameof(DashboardWidgetData.Timestamp)}] AS [{nameof(DashboardWidgetDataOverviewDto.Timestamp)}],
                    [D].[{nameof(DashboardWidgetData.DisplayDate)}] AS [{nameof(DashboardWidgetDataOverviewDto.DisplayDate)}],
                    [D].[{nameof(DashboardWidgetData.Type)}] AS [{nameof(DashboardWidgetDataOverviewDto.Type)}],
                    [D].[{nameof(DashboardWidgetData.ImportFileName)}] AS [{nameof(DashboardWidgetDataOverviewDto.ImportFileName)}],
                FROM [DataBase].[dbo].[{nameof(DashboardWidgetData)}] [D]
                INNER JOIN [{nameof(aspnet_Users)}] [U] ON [U].[{nameof(aspnet_Users.UserId)}] = [D].[{nameof(DashboardWidgetData.UserId)}]";

            return metadataContext.Database.SqlQuery<DashboardWidgetDataOverviewDto>(query).ToList();
    }
}

public class DashboardWidgetDataOverviewDto
{
    public Guid Guid { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; }
    public DateTime Timestamp { get; set; }
    public DateTime DisplayDate { get; set; }
    public string Type { get; set; }
    public string ImportFileName { get; set; }
}

public class DashboardWidgetData
{
    public Guid Guid { get; set; }
    public Guid UserId { get; set; }
    public DateTime Timestamp { get; set; }
    public DateTime DisplayDate { get; set; }
    public string Type { get; set; }
    public string ImportFileName { get; set; }
}

public class aspnet_Users
{
    public Guid UserId { get; set; }
    public string UserName { get; set; }
}
