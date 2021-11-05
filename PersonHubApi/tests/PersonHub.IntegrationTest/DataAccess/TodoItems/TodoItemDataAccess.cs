using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using Npgsql;
using NpgsqlTypes;

namespace PersonHub.IntegrationTest.DataAccess.TodoItems
{
    public class TodoItemDataAccess
    {
        private readonly IDbConnectionPool connectionPool;

        private IDbConnection connection => this.connectionPool.GetOpenDbConnection();

        public TodoItemDataAccess(IDbConnectionPool connectionPool)
        {
            this.connectionPool = connectionPool;
        }

        public async Task<long> Insert(TodoItemEntity todoItemEntity)
        {
            var recordId = await this.connection.ExecuteScalarAsync<long>(@"
                INSERT INTO ""TodoItems""(""UserId"", ""Title"", ""Description"", ""Status"", ""ItemOrder"", ""CreatedDate"", ""Type"")
                VALUES (@UserId, @Title, @Description, @Status, @ItemOrder, @CreatedDate, @Type)
                RETURNING ""Id""
            ", new {
                UserId = todoItemEntity.UserId,
                Title = todoItemEntity.Title,
                Description = todoItemEntity.Description, 
                Status = todoItemEntity.Status, 
                ItemOrder = todoItemEntity.ItemOrder, 
                Type = todoItemEntity.Type, 
                // Use UTC before saving so that Dapper know to map to timestamptz type
                CreatedDate = todoItemEntity.CreatedDate.ToUniversalTime() 
            });

            return recordId;
        }

        public async Task<TodoItemEntity> Get(long todoItemId)
        {
            return await this.connection.QuerySingleOrDefaultAsync<TodoItemEntity>(@"
                SELECT * from ""TodoItems""
                WHERE ""Id"" = @TodoItemId
            ", new
            {
                TodoItemId = todoItemId
            });
        }
    }
}