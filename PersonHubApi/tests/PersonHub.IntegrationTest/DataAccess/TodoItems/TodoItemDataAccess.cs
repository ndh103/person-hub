using System.Data;
using System.Threading.Tasks;
using Dapper;
using PersonHub.Domain.TodoModule.Entities;

namespace PersonHub.IntegrationTest.DataAccess.TodoItems;

public class TodoItemDataAccess
{
    private readonly IDbConnectionPool connectionPool;

    private IDbConnection connection => this.connectionPool.GetOpenDbConnection();

    public TodoItemDataAccess(IDbConnectionPool connectionPool)
    {
        this.connectionPool = connectionPool;
    }

    public async Task<long> AddTopic(TodoTopicEntity topicEntity)
    {
        var recordId = await this.connection.ExecuteScalarAsync<long>(@"
                INSERT INTO ""TodoTopics""(""UserId"", ""Name"", ""Order"", ""CreatedDate"")
                VALUES (@UserId, @Name, @Order, @CreatedDate)
                RETURNING ""Id""
            ", new
        {
            UserId = topicEntity.UserId,
            Name = topicEntity.Name,
            Order = topicEntity.Order,
            // Use UTC before saving so that Dapper know to map to timestamptz type
            CreatedDate = topicEntity.CreatedDate.ToUniversalTime()
        });

        return recordId;
    }

    public async Task<TodoTopicEntity> GetTopic(long topicId)
    {
        return await this.connection.QuerySingleOrDefaultAsync<TodoTopicEntity>(@"
                SELECT * from ""TodoTopics""
                WHERE ""Id"" = @TopicId
            ", new
        {
            TopicId = topicId
        });
    }

    public async Task<long> Insert(TodoItemEntity todoItemEntity)
    {
        var recordId = await this.connection.ExecuteScalarAsync<long>(@"
                INSERT INTO ""TodoItems""(""UserId"", ""Title"", ""Description"", ""Status"", ""ItemOrder"", ""CreatedDate"", ""TodoTopicId"")
                VALUES (@UserId, @Title, @Description, @Status, @ItemOrder, @CreatedDate, @TopicId)
                RETURNING ""Id""
            ", new
        {
            UserId = todoItemEntity.UserId,
            Title = todoItemEntity.Title,
            Description = todoItemEntity.Description,
            Status = todoItemEntity.Status,
            ItemOrder = todoItemEntity.ItemOrder,
            TopicId = todoItemEntity.TopicId,
            // Use UTC before saving so that Dapper know to map to timestamptz type
            CreatedDate = todoItemEntity.CreatedDate.ToUniversalTime()
        });

        return recordId;
    }

    public async Task<TodoItemEntity> GetTodoItem(long todoItemId)
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