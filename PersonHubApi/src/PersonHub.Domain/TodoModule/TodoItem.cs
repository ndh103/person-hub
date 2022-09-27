using System;
using System.Text.Json.Serialization;
using PersonHub.Domain.Entities;
using PersonHub.Domain.Interfaces;

namespace PersonHub.Domain.TodoModule.Entities;

public class TodoItem : BaseEntity, IAggregateRoot
{
    [JsonInclude]
    public string UserId { get; private set; }

    [JsonInclude]
    public string Title { get; private set; }

    [JsonInclude]
    public string? Description { get; private set; }

    [JsonInclude]
    public TodoItemStatus Status { get; private set; }

    [JsonInclude]
    public long? TodoTopicId { get; private set; }

    [JsonInclude]
    public string ItemOrder { get; private set; }

    [JsonInclude]
    public DateTime CreatedDate { get; private set; }

    public TodoItem() { }

    public TodoItem(string userId, string title, string? description, TodoItemStatus status, string itemOrder, long? todoTopicId)
    {
        this.UserId = userId;
        this.Title = title;
        this.Description = description;
        this.Status = status;
        this.ItemOrder = itemOrder;
        this.TodoTopicId = todoTopicId;
        this.CreatedDate = DateTime.UtcNow;

        CheckEntityState();
    }

    public void Update(string title, string? description, string itemOrder)
    {
        this.Title = title;
        this.Description = description;
        this.ItemOrder = itemOrder;

        CheckEntityState();
    }

    public void MarkAsDone()
    {
        this.Status = TodoItemStatus.Done;

        CheckEntityState();
    }

    private void CheckEntityState()
    {
        if (string.IsNullOrWhiteSpace(UserId))
        {
            _entityState.AddError("TodoItem UserId is required");
        }

        if (string.IsNullOrWhiteSpace(Title))
        {
            _entityState.AddError("TodoItem Title is required");
        }

        if (!string.IsNullOrEmpty(Title) && Title.Length > 250)
        {
            _entityState.AddError("Title exceeds the maximum characters of 250");
        }

        if (!string.IsNullOrEmpty(Description) && Description.Length > 1000)
        {
            _entityState.AddError("Description exceeds the maximum characters of 1000");
        }

        if (!Enum.IsDefined(typeof(TodoItemStatus), Status))
        {
            _entityState.AddError("TodoItem status is invalid");
        }

        if (string.IsNullOrEmpty(ItemOrder))
        {
            _entityState.AddError("TodoItem ItemOrder is required");
        }
    }
}
