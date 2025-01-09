public class DashboardController : Controller
{
    private readonly DashboardService dashboardService;

    public DashboardController(DashboardService service)
    {
        dashboardService = service;
    }

    public IActionResult Index()
    {
        var data = dashboardService.GetDashboardWidgetDataOverview();
        return View(data);
    }
}
