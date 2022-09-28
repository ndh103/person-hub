using System;
using PersonHub.IntegrationTest.DataAccess.TodoItems;
using PersonHub.Domain.TodoModule.Entities;
using PersonHub.IntegrationTest.Stubs;
using PersonHub.Api.Areas.Todos.Models;
using Xunit;

namespace PersonHub.IntegrationTest.Tests.TodoItems;

public static class TodoItemTestHelper
{
    public static TodoItemEntity GenerateRandomTodoItemEntity()
    {
        var randomString = Guid.NewGuid().ToString();

        return new TodoItemEntity()
        {
            CreatedDate = DateTime.UtcNow,
            Description = $"Description {randomString}",
            ItemOrder = $"ItemOrder {randomString}",
            Status = TodoItemStatus.Todo,
            Title = $"Title {randomString}",
            UserId = TestAuthHandler.TestUserEmail
        };
    }

    public static TodoItemDto GenerateRandomTodoItemDto()
    {
        var randomString = Guid.NewGuid().ToString();

        return new TodoItemDto()
        {
            Description = $"Description {randomString}",
            ItemOrder = $"ItemOrder {randomString}",
            Status = TodoItemStatus.Todo,
            Title = $"Title {randomString}",
        };
    }

    public static TodoTopicDto GenerateRandomTopicDto()
    {
        var randomString = Guid.NewGuid().ToString();

        return new TodoTopicDto()
        {
            Name = $"Name {randomString}",
            Order = $"Order {randomString}",
        };
    }

    public static void AssertEqual(TodoItemDto dto, TodoItemEntity item)
    {
        Assert.True(dto.Description == item.Description, "Description is not equal");
        Assert.True(dto.ItemOrder == item.ItemOrder, "ItemOrder is not equal");
        Assert.True(dto.Status == item.Status, "Status is not equal");
        Assert.True(dto.Title == item.Title, "Title is not equal");
    }

    public static void AssertEqual(TodoItemEntity todoItemEntity, TodoItem item)
    {
        Assert.True(todoItemEntity.Description == item.Description, "Description is not equal");
        Assert.True(todoItemEntity.ItemOrder == item.ItemOrder, "ItemOrder is not equal");
        Assert.True(todoItemEntity.Status == item.Status, "Status is not equal");
        Assert.True(todoItemEntity.Title == item.Title, "Title is not equal");
        Assert.True(TestHelper.EqualsUpToSeconds(todoItemEntity.CreatedDate, item.CreatedDate), "CreatedDate is not equal");
    }

    public static void AssertEqual(TodoTopicDto dto, TodoTopicEntity item)
    {
        Assert.True(dto.Name == item.Name, "Description is not equal");
        Assert.True(dto.Order == item.Order, "ItemOrder is not equal");
    }
}
