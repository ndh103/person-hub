using PersonHub.Api.Common.Configs;

namespace PersonHub.Api.Common.DependencyInjections;

public static class AddApplicationOptionsExtension
{
    public static IServiceCollection AddApplicationOptions(this IServiceCollection serviceCollection, IConfiguration configuration)
    {
        serviceCollection.Configure<DatabaseConnectionConfig>(configuration.GetSection(nameof(DatabaseConnectionConfig)));

        return serviceCollection;
    }
}
