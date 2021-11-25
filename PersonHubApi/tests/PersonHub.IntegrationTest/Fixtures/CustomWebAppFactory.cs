using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using PersonHub.IntegrationTest.Stubs;

namespace PersonHub.IntegrationTest.Fixtures
{
    public class CustomWebAppFactory : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            // this block of code will run first before Program.cs code run
            builder.UseEnvironment("IntegrationTest");

            // Codes inside ConfigureServices will run just right before builder.Build() in the Program.cs of the SUT
            // This is the place to manipulate services registration in IServiceColletion
            builder.ConfigureServices(services =>
            {
                // Fake Authentication
                services.AddAuthentication("Test").AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", options => { });
            });
        }
    }
}
