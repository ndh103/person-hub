using System;
using System.Net.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Hosting;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Dapper;
using Npgsql;
using System.IO;
using System.Reflection;
using System.Linq;
using PersonHub.Api;
using PersonHub.IntegrationTest.DataAccess;
using Microsoft.Extensions.Configuration;
using PersonHub.Api.Common.Configs;
using Microsoft.Extensions.Options;
using PersonHub.IntegrationTest.DataAccess.FinisherItems;

namespace PersonHub.IntegrationTest.Fixtures
{
    public class IntegrationTestClassFixture : IDisposable
    {
        private WebApplicationFactory<IntegrationTestStartup> factory;

        public HttpClient Client;

        public FinisherItemDataAccess FinisherItemDataAccess;

        private IConfigurationRoot configuration;

        public IntegrationTestClassFixture()
        {
            // Init config
            this.configuration = new ConfigurationBuilder()
                .AddJsonFile("appsettings.Test.json")
                .Build();

            var dbConfig = configuration.GetSection(nameof(DatabaseConnectionConfig)).Get<DatabaseConnectionConfig>();

            factory = new CustomWebAppFactory<IntegrationTestStartup>().WithWebHostBuilder(builder =>
            {
                builder.UseSolutionRelativeContentRoot("src/PersonHub.Api");

                builder.ConfigureTestServices(services =>
                {
                    services.AddControllersWithViews().AddApplicationPart(typeof(Startup).Assembly);
                });
            });

            Client = factory.CreateClient();
            Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Test", null);

            IOptions<DatabaseConnectionConfig> dbConfigOptions = Options.Create(dbConfig);
            var connectionPool = new DbConnectionPool(dbConfigOptions);

            FinisherItemDataAccess = new FinisherItemDataAccess(connectionPool);
        }

        public void Dispose()
        {
            factory.Dispose();
            Client.Dispose();
        }
    }
}