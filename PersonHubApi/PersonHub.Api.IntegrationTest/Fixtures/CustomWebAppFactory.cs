using System;
using System.Collections.Generic;
using System.IO;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Serilog;
using System.Linq;
using System.Reflection;
using Microsoft.EntityFrameworkCore;
using PersonHub.Api.Infrastructure.DataAccess;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace PersonHub.Api.IntegrationTest.Fixtures
{
    public class CustomWebAppFactory<TTestStartup> : WebApplicationFactory<TTestStartup> where TTestStartup : class
    {
        protected override IHostBuilder CreateHostBuilder()
        {
            var host = Host.CreateDefaultBuilder()
                            .ConfigureWebHostDefaults(builder =>
                            {
                                builder.UseStartup<TTestStartup>();
                                builder.UseEnvironment("Test");

                                builder.ConfigureAppConfiguration(config =>
                                {
                                    var projectDir = Directory.GetCurrentDirectory();
                                    var configPath = Path.Combine(projectDir, "appsettings.Test.json");

                                    config.AddJsonFile(configPath, false, false);

                                    var inMemorySettings = new Dictionary<string, string>
                                    {
                                       {"DatabaseConnectionConfig:PersonHub:SearchPath", "person-hub-test"},
                                    };

                                    config.AddInMemoryCollection(inMemorySettings);
                                });

                                builder.ConfigureServices(async services =>
                                {
                                    using (var scope = services.BuildServiceProvider().CreateScope())
                                    {
                                        var scopedServices = scope.ServiceProvider;
                                        var dbContext = scopedServices.GetRequiredService<PersonHubDbContext>();
                                        var logger = scopedServices
                                            .GetRequiredService<ILogger<CustomWebAppFactory<IntegrationTestStartup>>>();

                                        dbContext.Database.EnsureCreated();

                                        try
                                        {
                                            await dbContext.Database.ExecuteSqlRawAsync("set Search_Path to \"public\"; DROP SCHEMA IF EXISTS \"person-hub-test\" CASCADE; CREATE SCHEMA \"person-hub-test\";");

                                            string path = Path.Combine(Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location), @"../../../../sql");
                                            var files = Directory.GetFiles(path).OrderBy(r => r);
                                            var setSearchPathSql = "set Search_Path to \"person-hub-test\";";

                                            if (!files.Any())
                                            {
                                                throw new Exception("WRONG SQL PATH FOLDER");
                                            }


                                            foreach (var filePath in files)
                                            {
                                                string sqlContent = File.ReadAllText(filePath);
                                                await dbContext.Database.ExecuteSqlRawAsync(setSearchPathSql + sqlContent);
                                            }
                                        }
                                        catch (Exception ex)
                                        {
                                            dbContext.Dispose();
                                            logger.LogError(ex, "An error occurred seeding the " +
                                                "database with test messages. Error: {Message}", ex.Message);
                                        }
                                    }
                                });
                            });

            return host;
        }
    }
}
