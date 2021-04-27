using Finisherist.Api.Common.Configs;
using Finisherist.IdentityProvider;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace Finisherist.Api.Common.DependencyInjections.ServiceExtensions
{
    public static class AddDatabaseContextsExtension
    {
        public static IServiceCollection AddApplicationDbContexts(this IServiceCollection services, IConfiguration configuration)
        {
            var databaseConnectionConfig = configuration.GetSection(nameof(DatabaseConnectionConfig)).Get<DatabaseConnectionConfig>();

            services.AddApplicationDbContext<IdentityApplicationDbContext>(databaseConnectionConfig.Identity, migrationAssemblyName: "Finisherist.IdentityProvider");

            return services;
        }

        private static IServiceCollection AddApplicationDbContext<TDbContext>(this IServiceCollection services, DatabaseConnectionInfo databaseConnection, string migrationAssemblyName = "") where TDbContext : DbContext
        {
            var connectionStringBuilder = new NpgsqlConnectionStringBuilder()
            {
                Host = databaseConnection.Host,
                Port = databaseConnection.Port,
                Database = databaseConnection.Database,
                Username = databaseConnection.UserName,
                Password = databaseConnection.Password,
                SearchPath = databaseConnection.SearchPath
            };

            if (string.IsNullOrEmpty(migrationAssemblyName))
            {
                services.AddDbContext<TDbContext>(options =>
                                                 options.UseNpgsql(connectionStringBuilder.ToString()));
            }
            else
            {
                services.AddDbContext<TDbContext>(options =>
                                 options.UseNpgsql(connectionStringBuilder.ToString(), options => options.MigrationsAssembly(migrationAssemblyName)));
            }

            return services;
        }

    }
}