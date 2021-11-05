using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using Npgsql;
using PersonHub.Api.Common.Configs;

namespace PersonHub.IntegrationTest.DataAccess
{
    public class DbConnectionPool : IDbConnectionPool, IDisposable
    {
        private string connectionString = "";

        private IDbConnection connection;

        public DbConnectionPool(IOptions<DatabaseConnectionConfig> dbConnectionOptions)
        {
            var personHubDbConfig = dbConnectionOptions.Value.PersonHub;

            var connectionStringBuilder = new NpgsqlConnectionStringBuilder()
            {
                Host = personHubDbConfig.Host,
                Port = personHubDbConfig.Port,
                Database = personHubDbConfig.Database,
                SearchPath = personHubDbConfig.SearchPath,
                Username = personHubDbConfig.UserName,
                Password = personHubDbConfig.Password,
                SslMode = (SslMode)personHubDbConfig.SslMode
            };

            this.connectionString = connectionStringBuilder.ConnectionString;
        }

        public void Dispose()
        {
            if (this.connection != null)
            {
                this.connection.Dispose();
                this.connection = null;
            }
        }

        public IDbConnection GetOpenDbConnection()
        {
            if (this.connection != null)
            {
                return this.connection;
            }

            this.connection = new NpgsqlConnection(this.connectionString);
            this.connection.Open();
            return connection;
        }
    }
}