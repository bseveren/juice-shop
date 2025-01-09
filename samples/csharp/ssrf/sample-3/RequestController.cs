using System.Data;
using System.Net.Http;

namespace AcmeCorp.Services
{
    public class RequestController
    {
      private readonly HttpClient _httpClient;

      public RequestController()
      {
          _httpClient = new HttpClient();
      }

      public static HttpResponseMessage GetMessage(string url, string query)
      {
          if (url == null) throw new ArgumentNullException(nameof(url), "The request url is null");
          Uri uri = new Uri(url + query);
          return _httpClient.GetAsync(uri);
      }

    }
}
