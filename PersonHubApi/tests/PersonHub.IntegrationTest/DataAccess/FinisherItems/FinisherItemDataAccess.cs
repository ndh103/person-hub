using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PersonHub.Domain.FinisherModule;
using Dapper;
using System.Data;

namespace PersonHub.IntegrationTest.DataAccess.FinisherItems
{
    public class FinisherItemDataAccess
    {
        private readonly IDbConnectionPool connectionPool;

        private IDbConnection connection => connectionPool.GetOpenDbConnection();

        public FinisherItemDataAccess(IDbConnectionPool connectionPool)
        {
            this.connectionPool = connectionPool;
        }

        public async Task<int> Insert(FinisherItemEntity itemEntity)
        {
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

        public async Task<int> InsertLog(FinisherItemLogEntity logEntity)
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
                                                CreatedDate = logEntity.CreatedDate
                                            });

            return recordId;
        }



        public async Task CleanUp()
        {
            await connection.ExecuteAsync("delete from FinisherItemLog");
            await connection.ExecuteAsync("delete from FinisherItems");
        }
    }
}