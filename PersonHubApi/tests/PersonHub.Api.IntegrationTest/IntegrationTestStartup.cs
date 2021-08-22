using System;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PersonHub.Api.IntegrationTest.Stubs;

namespace PersonHub.Api.IntegrationTest
{
    public class IntegrationTestStartup : Startup
    {
        public IntegrationTestStartup(IWebHostEnvironment environment, IConfiguration configuration): base(environment, configuration)
        {

        }

        protected override void AddAuthentication(IServiceCollection services)
        {
            services.AddAuthentication("Test").AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", options => { });
        }
    }
}
