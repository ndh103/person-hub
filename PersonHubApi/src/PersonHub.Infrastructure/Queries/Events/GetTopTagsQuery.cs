using System.Collections.Generic;
using System.Threading.Tasks;
using PersonHub.Domain.EventsModule.Queries;
using Dapper;

namespace PersonHub.Infrastructure.Queries.Events;

public class GetTopTagsQuery : IGetTopTagsQuery
{
    private readonly IDbConnectionProvider dbConnectionProvider;

    public GetTopTagsQuery(IDbConnectionProvider dbConnectionProvider)
    {
        this.dbConnectionProvider = dbConnectionProvider;
    }

    public async Task<IEnumerable<string>> QueryAsync(string userId, int limit)
    {
        using var connection = this.dbConnectionProvider.GetOpenConnection();

        var query = @"select tag, count(*)
                    from ""Events"" e, unnest(e.""Tags"") tag
                    where e.""UserId"" =@userId
                    group by tag
                    having count(*) > 1
                    order by count(*) desc limit @limit";

        var result = await connection.QueryAsync<string>(query, new {
            userId,
            limit
        });
        
        return result;
    }
}