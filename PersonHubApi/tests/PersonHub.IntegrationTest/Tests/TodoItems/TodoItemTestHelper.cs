using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PersonHub.IntegrationTest.DataAccess.TodoItems;
using PersonHub.Domain.TodoModule.Entities;
using PersonHub.IntegrationTest.Stubs;
using PersonHub.Api.Areas.Todos.Models;
using Xunit;

namespace PersonHub.IntegrationTest.Tests.TodoItems
{
    public static class TodoItemTestHelper
    {
        public static TodoItemEntity GenerateRandomTodoItemEntity()
        {
            var randomString = Guid.NewGuid().ToString();

            return new TodoItemEntity()
            {
                CreatedDate = DateTime.Now,
                Description = $"Description {randomString}",
                ItemOrder = $"ItemOrder {randomString}",
                Status = TodoItemStatus.Todo,
                Title = $"Title {randomString}",
                Type = TodoItemType.Todo,
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
                Type = TodoItemType.Todo,
            };
        }

        public static void AssertEqual(TodoItemDto dto, TodoItemEntity item){
            Assert.True(dto.Description == item.Description, "Description is not equal");
            Assert.True(dto.ItemOrder == item.ItemOrder, "ItemOrder is not equal");
            Assert.True(dto.Status == item.Status, "Status is not equal");
            Assert.True(dto.Title == item.Title, "Title is not equal");
            Assert.True(dto.Type == item.Type, "Type is not equal");
        }

        public static void AssertEqual(TodoItemEntity todoItemEntity, TodoItem item){
            Assert.True(todoItemEntity.Description == item.Description, "Description is not equal");
            Assert.True(todoItemEntity.ItemOrder == item.ItemOrder, "ItemOrder is not equal");
            Assert.True(todoItemEntity.Status == item.Status, "Status is not equal");
            Assert.True(todoItemEntity.Title == item.Title, "Title is not equal");
            Assert.True(todoItemEntity.Type == item.Type, "Type is not equal");
            Assert.True(TestHelper.EqualsUpToSeconds(todoItemEntity.CreatedDate, item.CreatedDate), "CreatedDate is not equal");
        }
    }
}