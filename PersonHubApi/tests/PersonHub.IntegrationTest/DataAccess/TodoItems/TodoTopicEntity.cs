using System;
using PersonHub.Domain.TodoModule.Entities;

namespace PersonHub.IntegrationTest.DataAccess.TodoItems;

public class TodoTopicEntity
{
    public long Id { get; set; }

    public string UserId { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Order { get; set; } = string.Empty;

    public DateTime CreatedDate { get; set; }
}