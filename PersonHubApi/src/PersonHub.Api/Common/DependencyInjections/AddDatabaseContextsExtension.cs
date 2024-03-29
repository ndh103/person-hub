using Microsoft.EntityFrameworkCore;
using Npgsql;
using PersonHub.Domain.Shared;
using PersonHub.Infrastructure.DataAccess;

namespace PersonHub.Api.Common.DependencyInjections;

public static class AddDatabaseContextsExtension
{
    public static IServiceCollection AddApplicationDbContexts(this IServiceCollection services, IConfiguration configuration)
    {
        var databaseConnectionConfig = configuration.GetSection(nameof(DatabaseConnectionConfig)).Get<DatabaseConnectionConfig>();

        services.AddApplicationDbContext<PersonHubDbContext>(databaseConnectionConfig);

        return services;
    }

    private static IServiceCollection AddApplicationDbContext<TDbContext>(this IServiceCollection services, DatabaseConnectionConfig databaseConnection, string migrationAssemblyName = "") where TDbContext : DbContext
    {
        var connectionStringBuilder = new NpgsqlConnectionStringBuilder()
        {
            Host = databaseConnection.Host,
            Port = databaseConnection.Port,
            Database = databaseConnection.Database,
            Username = databaseConnection.UserName,
            Password = databaseConnection.Password,
            SearchPath = databaseConnection.SearchPath,
            SslMode = (SslMode)databaseConnection.SslMode,
            TrustServerCertificate = true
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
