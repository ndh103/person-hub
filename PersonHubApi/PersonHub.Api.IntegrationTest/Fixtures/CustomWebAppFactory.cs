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
                            });

            return host;
        }
    }
}
