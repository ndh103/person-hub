using System;
using System.Net.Http;
using System.Net.Http.Headers;
using PersonHub.IntegrationTest.DataAccess;
using Microsoft.Extensions.Configuration;
using PersonHub.Api.Common.Configs;
using Microsoft.Extensions.Options;
using PersonHub.IntegrationTest.DataAccess.FinisherItems;
using PersonHub.IntegrationTest.DataAccess.TodoItems;

namespace PersonHub.IntegrationTest.Fixtures
{
    public class IntegrationTestClassFixture : IDisposable
    {
        private CustomWebAppFactory factory;

        public HttpClient Client;

        public FinisherItemDataAccess FinisherItemDataAccess;

        public TodoItemDataAccess TodoItemDataAccess;

        private IConfigurationRoot configuration;

        public IntegrationTestClassFixture()
        {
            // Init config
            this.configuration = new ConfigurationBuilder()
                .AddJsonFile("appsettings.IntegrationTest.json")
                .Build();

            var dbConfig = configuration.GetSection(nameof(DatabaseConnectionConfig)).Get<DatabaseConnectionConfig>();

            factory = new CustomWebAppFactory();

            Client = factory.CreateClient();
            Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Test", null);

            IOptions<DatabaseConnectionConfig> dbConfigOptions = Options.Create(dbConfig);
            var connectionPool = new DbConnectionPool(dbConfigOptions);

            FinisherItemDataAccess = new FinisherItemDataAccess(connectionPool);
            TodoItemDataAccess = new TodoItemDataAccess(connectionPool);
        }

        public void Dispose()
        {
            factory.Dispose();
            Client.Dispose();
        }
    }
}