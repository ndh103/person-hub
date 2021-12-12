using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Identity.Web;
using Microsoft.IdentityModel.Tokens;

namespace PersonHub.Api.Common.DependencyInjections;

public static class AddAppAuthenticationExtension
{
    public static void AddAppAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        string activeAuthentication = configuration["Authentication:ActiveImplementation"];

        if (activeAuthentication == "Auth0")
        {
            var authority = configuration["Authentication:Auth0:Authority"];
            var audience = configuration["Authentication:Auth0:ApiIdentifier"];

            services.AddAuthentication(options =>
                        {
                            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                        }).AddJwtBearer(options =>
                        {
                            options.Authority = authority;
                            options.Audience = audience;
                                // If the access token does not have a `sub` claim, `User.Identity.Name` will be `null`. Map it to a different claim by setting the NameClaimType below.
                            options.TokenValidationParameters = new TokenValidationParameters
                            {
                                NameClaimType = ClaimTypes.NameIdentifier
                            };
                        });

            return;
        }
    }
}
