using System.Data;

namespace PersonHub.IntegrationTest.DataAccess;

public interface IDbConnectionPool
{
    IDbConnection GetOpenDbConnection();
}