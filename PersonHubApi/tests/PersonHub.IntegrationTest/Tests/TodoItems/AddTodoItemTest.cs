using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using PersonHub.Api.Areas.Todos.Models;
using PersonHub.Domain.TodoModule.Entities;
using PersonHub.IntegrationTest.Fixtures;
using Xunit;

namespace PersonHub.IntegrationTest.Tests.TodoItems
{

    public class AddTodoItemTest : TestBaseClass
    {
        public AddTodoItemTest(IntegrationTestClassFixture fixture) : base(fixture)
        {
        }

        [Fact]
        public async Task AddTodoItem_ValidItem_ShouldSuccess()
        {
            var todoItemDto = new TodoItemDto()
            {
                Title = "title",
                Description = DateTime.Now.ToString(),
                Status = TodoItemStatus.Todo,
                ItemOrder = "item order 1"
            };

            var response = await Fixture.Client.PostAsJsonAsync("/todos/items", todoItemDto);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<TodoItem>();

            Assert.True(result.Id > 0);
            Assert.Equal(todoItemDto.Title, result.Title);
            Assert.Equal(todoItemDto.Description, result.Description);
            Assert.Equal(todoItemDto.Status, result.Status);
            Assert.Equal(todoItemDto.ItemOrder, result.ItemOrder);
        }

        [Theory]
        [MemberData(nameof(InvalidAddTodoItemRequest))]
        public async Task AddTodoItem_InvalidItem_ShouldFailed(TodoItemDto todoItemDto)
        {
            var response = await Fixture.Client.PostAsJsonAsync("/todos/items", todoItemDto);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }
        
        public static IEnumerable<object[]> InvalidAddTodoItemRequest()
        {
            var result = new List<object[]>() { };

            // Missing Title
            var missingTitleDto = CreateTodoItemDto();
            missingTitleDto.Title = string.Empty;

            yield return new object[] { missingTitleDto };

            // Title is larger than 250 characters
            var exceedLengthTitleDto = CreateTodoItemDto();
            exceedLengthTitleDto.Title = @"rmvge9YPEqZA73YQnwybPHqiZQvhOHeuJMiekbjBsUJKhOVzL1oGAavizsuR7EeSeK8hFnkD MEOXjYtNOJiHIBBXuSqQz
            TwmWsBqqP1lRKmE3gQ46LdyXjmAWlrlVb6EDziImgSpPJhJByZV2nD2FFLciQeH3rhv14z2cV I0Os4ugyC2y i1wHQYYL1upIy3DLM5Km7HPITUrOrRWZdOLcGAM8kzzmom q5RKtqlw91e6HvnxoydcKZ2H";

            yield return new object[]{ exceedLengthTitleDto };

            // Missing ItemOrder
            var missingItemOrderDto = CreateTodoItemDto();
            missingItemOrderDto.ItemOrder = string.Empty;
            yield return new object[] { missingItemOrderDto };
        }

        private static TodoItemDto CreateTodoItemDto()
        {
            return new TodoItemDto()
            {
                Title = "title",
                Description = "description",
                Status = TodoItemStatus.Todo,
                ItemOrder = "item order"
            };
        }
    }
}