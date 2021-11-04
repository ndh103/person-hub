using System;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PersonHub.Api;
using PersonHub.Api.Common.Configs;
using PersonHub.IntegrationTest.DataAccess;
using PersonHub.IntegrationTest.Stubs;

namespace PersonHub.IntegrationTest
{
    public class IntegrationTestStartup : Startup
    {
        public IntegrationTestStartup(IWebHostEnvironment environment, IConfiguration configuration) : base(environment, configuration)
        {

        }

        protected override void AddAuthentication(IServiceCollection services)
        {
            services.AddAuthentication("Test").AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", options => { });
        }
    }
}
