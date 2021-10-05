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

    public class DeleteTodoItemTest : TestBaseClass
    {
        public DeleteTodoItemTest(IntegrationTestClassFixture fixture) : base(fixture)
        {
        }

        [Fact]
        public async Task DeleteTodoItemTest_ValidItem_ShouldSuccess()
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
            var response = await Fixture.Client.DeleteAsync($"/todos/items/{addedTodoItem.Id}");
            response.EnsureSuccessStatusCode();

            // Assert
            var getResponse = await Fixture.Client.GetAsync($"/todos/items/{addedTodoItem.Id}");
            Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
        }

        [Fact]
        public async Task DeleteTodoItem_WrongId_NotFound()
        {
            // Arrange, prepare a existing todoItem
            var notFoundId = 12345;
            var response = await Fixture.Client.DeleteAsync($"/todos/items/{notFoundId}");

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