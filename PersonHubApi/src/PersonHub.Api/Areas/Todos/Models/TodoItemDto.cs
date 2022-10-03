using PersonHub.Domain.TodoModule.Entities;

namespace PersonHub.Api.Areas.Todos.Models;

public class TodoItemDto
{
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public TodoItemStatus Status { get; set; }

    public long? TodoTopicId { get; set; }

    public string ItemOrder { get; set; } = string.Empty;
}
