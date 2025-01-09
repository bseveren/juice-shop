using System.Data;
using System.Net.Http;

namespace AcmeCorp.Services
{
    public class ClassVariables
    {
      private readonly HttpClient _httpClient;
      private const string Resource = "external/siblingModeration";

      public ClassVariables()
      {
          _httpClient = new HttpClient();
      }

      public async void GetChildrenByDateRangeAsync(YearMonthRequest yearMonth)
      {
        var responseMessage = await _httpClient.GetAsync($"{Resource}/children?Year={yearMonth.Year}&Month={yearMonth.Month}");
      }

    }
}
