using Finisherist.Api.Common.Configs;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Finisherist.Api.Common.DependencyInjections.ServiceExtensions
{
    public static class AddApplicationOptionsExtension
    {
        public static IServiceCollection AddApplicationOptions(this IServiceCollection serviceCollection, IConfiguration configuration)
        {
            serviceCollection.Configure<DatabaseConnectionConfig>(configuration.GetSection(nameof(DatabaseConnectionConfig)));

            return serviceCollection;
        }
    }
}