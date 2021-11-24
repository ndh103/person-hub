using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Identity.Web;
using Microsoft.IdentityModel.Tokens;

namespace PersonHub.Api.Common.DependencyInjections
{
    public static class AddAppAuthenticationExtension
    {
        public static void AddAppAuthentication(this IServiceCollection services, IConfiguration configuration)
        {
            string activeAuthentication = configuration["Authentication:ActiveImplementation"];

            if (activeAuthentication == "Auth0")
            {
                services.AddAuthentication(options =>
                            {
                                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                            }).AddJwtBearer(options =>
                            {
                                options.Authority = configuration["Authentication:Auth0:Authority"];
                                options.Audience = configuration["Authentication:Auth0:ApiIdentifier"];
                                // If the access token does not have a `sub` claim, `User.Identity.Name` will be `null`. Map it to a different claim by setting the NameClaimType below.
                                options.TokenValidationParameters = new TokenValidationParameters
                                {
                                    NameClaimType = ClaimTypes.NameIdentifier
                                };
                            });

                return;
            }

            if (activeAuthentication == "AzureAdB2C")
            {
                // Adds Microsoft Identity platform (Azure AD B2C) support to protect this Api
                services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                        .AddMicrosoftIdentityWebApi(
                            options =>
                            {
                                configuration.Bind("Authentication:AzureAdB2C", options);

                                options.TokenValidationParameters.NameClaimType = "name";
                            },
                            options => { configuration.Bind("Authentication:AzureAdB2C", options); });
                return;
            }
        }
    }
}