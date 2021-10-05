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
    [Collection("Test collection")]

    public class GetTodoItemTest : TestBaseClass
    {
        public GetTodoItemTest(IntegrationTestClassFixture fixture) : base(fixture)
        {
        }

        [Fact]
        public async Task GetTodoItem_ValidId_ShouldSuccess()
        {
            var todoItemDto = new TodoItemDto()
            {
                Title = "title",
                Description = "description v1",
                Status = TodoItemStatus.Todo,
                ItemOrder = "item order"
            };

            // Arrange, prepare a existing todoItem
            var addResponse = await Fixture.Client.PostAsJsonAsync("/todos/items", todoItemDto);
            addResponse.EnsureSuccessStatusCode();
            var addedTodoItem = await addResponse.Content.ReadFromJsonAsync<TodoItem>();

            // Act
            var updatedTodoItem = await Fixture.Client.GetFromJsonAsync<TodoItem>($"/todos/items/{addedTodoItem.Id}");

            Assert.Equal(todoItemDto.Title, updatedTodoItem.Title);
            Assert.Equal(todoItemDto.Description, updatedTodoItem.Description);
            Assert.Equal(todoItemDto.Status, updatedTodoItem.Status);
            Assert.Equal(todoItemDto.ItemOrder, updatedTodoItem.ItemOrder);
        }

        [Fact]
        public async Task GetTodoItem_InvalidId_NotFound()
        {
            const int notFoundId = 12345;

            // Act
            var response = await Fixture.Client.GetAsync($"/todos/items/{notFoundId}");

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
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