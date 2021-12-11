using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;

namespace PersonHub.Infrastructure.Queries
{
    public interface IDbConnectionProvider
    {
        IDbConnection GetOpenConnection();
    }
}