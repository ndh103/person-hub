using System;
using PersonHub.Domain.TodoModule.Entities;

namespace PersonHub.IntegrationTest.DataAccess.TodoItems;

public class TodoItemEntity
{
    public long Id { get; set; }

    public string UserId { get; set; }

    public string Title { get; set; }

    public string Description { get; set; }

    public TodoItemStatus Status { get; set; }

    public TodoItemType Type { get; set; }

    public string ItemOrder { get; set; }

    public DateTime CreatedDate { get; set; }
}