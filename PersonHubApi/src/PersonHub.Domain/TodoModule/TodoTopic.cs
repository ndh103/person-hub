using System;
using System.Collections.Generic;
using PersonHub.Domain.Entities;

namespace PersonHub.Domain.TodoModule.Entities;

public class TodoTopic : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    public List<TodoItem> TodoItems { get; set; } = new List<TodoItem>();

    public DateTime CreatedDate { get; set; }
}
