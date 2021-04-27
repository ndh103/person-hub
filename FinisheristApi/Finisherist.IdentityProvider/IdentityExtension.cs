using Finisherist.IdentityProvider.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace Finisherist.IdentityProvider
{
    public static class IdentityExtension
    {
        public static IServiceCollection AddIdentityAuthentication(this IServiceCollection services)
        {
            // ASP.NET Core Identity
            services.AddIdentity<ApplicationUser, IdentityRole>()
                .AddEntityFrameworkStores<IdentityApplicationDbContext>()
                .AddDefaultTokenProviders();

            // Identity Server
            var builder = services.AddIdentityServer(options =>
            {
                options.Events.RaiseErrorEvents = true;
                options.Events.RaiseInformationEvents = true;
                options.Events.RaiseFailureEvents = true;
                options.Events.RaiseSuccessEvents = true;

                // see https://identityserver4.readthedocs.io/en/latest/topics/resources.html
                options.EmitStaticAudienceClaim = true;
            })
                .AddInMemoryIdentityResources(IdentityConfig.IdentityResources)
                .AddInMemoryApiScopes(IdentityConfig.ApiScopes)
                .AddInMemoryClients(IdentityConfig.Clients)
                .AddAspNetIdentity<ApplicationUser>();

            // not recommended for production - you need to store your key material somewhere secure
            builder.AddDeveloperSigningCredential();

            services.AddAuthentication();

            return services;
        }
    }
}