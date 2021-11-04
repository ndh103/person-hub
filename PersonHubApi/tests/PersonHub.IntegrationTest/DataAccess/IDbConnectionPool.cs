using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;

namespace PersonHub.IntegrationTest.DataAccess
{
    public interface IDbConnectionPool
    {
        IDbConnection GetOpenDbConnection();
    }
}   