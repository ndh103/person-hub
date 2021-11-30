using System.Collections.Generic;
using System.Threading.Tasks;
using Dapper;
using System.Data;

namespace PersonHub.IntegrationTest.DataAccess.FinisherItems;

public class FinisherItemDataAccess
{
    private readonly IDbConnectionPool connectionPool;

    private IDbConnection connection => connectionPool.GetOpenDbConnection();

    public FinisherItemDataAccess(IDbConnectionPool connectionPool)
    {
        this.connectionPool = connectionPool;
    }

    public async Task<int> InsertAsync(FinisherItemEntity itemEntity)
    {
        if (itemEntity.StartDate.HasValue)
        {
            itemEntity.StartDate = itemEntity.StartDate.Value.ToUniversalTime();
        }

        if (itemEntity.FinishDate.HasValue)
        {
            itemEntity.FinishDate = itemEntity.FinishDate.Value.ToUniversalTime();
        }

        var recordId = await connection.ExecuteScalarAsync<int>(@"
                                            INSERT INTO ""FinisherItems""(""UserId"", ""Title"", ""Description"", ""StartDate"", ""FinishDate"", ""Status"", ""Tags"" ) 
                                            VALUES(@UserId, @Title, @Description, @StartDate, @FinishDate, @Status, @Tags)
                                            RETURNING ""Id""
                                            ",
                                        new
                                        {
                                            UserId = itemEntity.UserId,
                                            Title = itemEntity.Title,
                                            Description = itemEntity.Description,
                                            StartDate = itemEntity.StartDate,
                                            FinishDate = itemEntity.FinishDate,
                                            Status = itemEntity.Status,
                                            Tags = itemEntity.Tags
                                        });

        return recordId;
    }

    public async Task<int> InsertLogAsync(FinisherItemLogEntity logEntity)
    {
        var recordId = await connection.ExecuteScalarAsync<int>(@"
                                            INSERT INTO ""FinisherItemLog""(""FinisherItemId"", ""Content"", ""CreatedDate"") 
                                            VALUES(@FinisherItemId, @Content, @CreatedDate)
                                            RETURNING ""Id""
                                            ",
                                        new
                                        {
                                            FinisherItemId = logEntity.FinisherItemId,
                                            Content = logEntity.Content,
                                            CreatedDate = logEntity.CreatedDate.ToUniversalTime()
                                        });

        return recordId;
    }

    public async Task<FinisherItemEntity> GetFinisherItemAsync(long itemId)
    {
        var result = await connection.QuerySingleOrDefaultAsync<FinisherItemEntity>(@"
                SELECT * from ""FinisherItems""
                WHERE ""Id"" = @ItemId
            ", new
        {
            ItemId = itemId
        });

        return result;
    }

    public async Task<IEnumerable<FinisherItemLogEntity>> GetFinisherItemLogsAsync(long itemId)
    {
        var result = await connection.QueryAsync<FinisherItemLogEntity>(@"
                SELECT * from ""FinisherItemLog""
                WHERE ""FinisherItemId"" = @ItemId
            ", new
        {
            ItemId = itemId
        });

        return result;
    }

    public async Task CleanUpAsync()
    {
        await connection.ExecuteAsync("delete from FinisherItemLog");
        await connection.ExecuteAsync("delete from FinisherItems");
    }
}
