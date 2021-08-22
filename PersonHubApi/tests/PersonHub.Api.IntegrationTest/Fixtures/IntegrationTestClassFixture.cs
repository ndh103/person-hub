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

namespace PersonHub.Api.IntegrationTest.Fixtures
{
    public class IntegrationTestClassFixture : IDisposable
    {
        private WebApplicationFactory<IntegrationTestStartup> factory;

        public HttpClient Client;

        public IntegrationTestClassFixture()
        {
            //TODO: Read configuration from appsettings instead of hardcode here
            var connectionStringBuilder = new NpgsqlConnectionStringBuilder()
            {
                Host = "localhost",
                Port = 5432,
                Database = "person-hub-db-test",
                Username = "postgres",
                Password = "P@ssw0rd",
                SearchPath = "public"
            };

            using (var connection = new NpgsqlConnection(connectionStringBuilder.ConnectionString))
            {
                connection.Execute(@"set Search_Path to ""public""; 
                                            DROP SCHEMA IF EXISTS ""person-hub-test"" CASCADE; 
                                            CREATE SCHEMA ""person-hub-test"";
                                            grant usage on schema ""person-hub-test"" to public;
                                            grant create on schema ""person-hub-test"" to public;
                                            ");
            }

            connectionStringBuilder.SearchPath = "person-hub-test";
            using (var connection = new NpgsqlConnection(connectionStringBuilder.ConnectionString))
            {
                //TODO: Should found a robust way to get sql path
                string path = Path.Combine(Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location), @"../../../../../sql");
                var files = Directory.GetFiles(path).OrderBy(r => r);
                var setSearchPathSql = "set Search_Path to \"person-hub-test\";";

                if (!files.Any())
                {
                    throw new Exception("WRONG SQL PATH FOLDER");
                }

                foreach (var filePath in files)
                {
                    string sqlContent = File.ReadAllText(filePath);
                    connection.Execute(setSearchPathSql + sqlContent);
                }
            }

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
        }

        public void Dispose()
        {
            factory.Dispose();
            Client.Dispose();
        }
    }
}