using System;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using Npgsql;
using PersonHub.Domain.Shared;
using System.Data.SqlClient;

namespace PersonHub.Infrastructure.Queries
{
    public class DbConnectionProvider : IDbConnectionProvider, IDisposable
    {
        private readonly string connectionString;
        private IDbConnection? connection;

        public DbConnectionProvider(IOptions<DatabaseConnectionConfig> dbConfigOptions)
        {
            var dbConfig = dbConfigOptions.Value;
            var connectionStringBuilder = new NpgsqlConnectionStringBuilder()
            {
                Host = dbConfig.Host,
                Port = dbConfig.Port,
                Database = dbConfig.Database,
                Username = dbConfig.UserName,
                Password = dbConfig.Password,
                SearchPath = dbConfig.SearchPath,
                SslMode = (SslMode)dbConfig.SslMode,
                TrustServerCertificate = true
            };

            this.connectionString = connectionStringBuilder.ConnectionString;
        }

        public IDbConnection GetOpenConnection()
        {
            if (connection != null)
            {
                return this.connection;
            }

            connection = new NpgsqlConnection(this.connectionString);
            connection.Open();

            return connection;
        }

        public void Dispose()
        {
            // Try/catch in case the connection already been disposed
            try
            {
                this.connection?.Close();
                this.connection?.Dispose();
            }
            finally
            {
                this.connection = null;
            }
        }
    }
}