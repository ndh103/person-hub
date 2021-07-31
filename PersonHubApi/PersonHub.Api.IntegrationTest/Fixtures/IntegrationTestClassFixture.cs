using System;
using System.Net.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Hosting;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

namespace PersonHub.Api.IntegrationTest.Fixtures
{
    public class IntegrationTestClassFixture : IDisposable
    {
        private WebApplicationFactory<IntegrationTestStartup> factory;

        public HttpClient Client;

        public IntegrationTestClassFixture()
        {
            factory = new CustomWebAppFactory<IntegrationTestStartup>().WithWebHostBuilder(builder =>
            {
                builder.UseSolutionRelativeContentRoot("PersonHub.Api");

                builder.ConfigureTestServices(services =>
                {
                    services.AddControllersWithViews().AddApplicationPart(typeof(Startup).Assembly);
                });
            });

            Client = factory.CreateClient();
            Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Test", "token");
        }

        public void Dispose()
        {
            factory.Dispose();
            Client.Dispose();
        }
    }
}