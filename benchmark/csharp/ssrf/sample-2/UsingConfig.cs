using System.Data;
using System.Net.Http;

namespace AcmeCorp.Services
{
    public class UsingConfig
    {
      private readonly HttpClient _httpClient;

      public UsingConfig()
      {
          _httpClient = new HttpClient();
      }

      private HttpClient CreateClient(IHttpClientFactory httpClientFactory, IOConfiguration configuration)
      {
          var client = httpClientFactory.CreateClient();

          client.BaseAddress = new Uri(configuration.BaseUrl);

          return client;

      }

    }
}
