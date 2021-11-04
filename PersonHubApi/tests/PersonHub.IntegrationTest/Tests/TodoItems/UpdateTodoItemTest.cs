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

    public class UpdateTodoItemTest : TestBaseClass
    {
        public UpdateTodoItemTest(IntegrationTestClassFixture fixture) : base(fixture)
        {
        }

        [Fact]
        public async Task UpdateTodoItem_ValidItem_ShouldSuccess()
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

            // Act, upate the existing todoItem
            todoItemDto.Title = "new title";
            
            var updateResponse = await Fixture.Client.PutAsJsonAsync($"/todos/items/{addedTodoItem.Id}", todoItemDto);
            updateResponse.EnsureSuccessStatusCode();

            // Assert
            var updatedTodoItem = await Fixture.Client.GetFromJsonAsync<TodoItem>($"/todos/items/{addedTodoItem.Id}");

            //TODO: using Automapper and Implement IEqualtable to enapsulate the comparision between entities
            Assert.Equal(todoItemDto.Title, updatedTodoItem.Title);
            Assert.Equal(todoItemDto.Description, updatedTodoItem.Description);
            Assert.Equal(todoItemDto.Status, updatedTodoItem.Status);
            Assert.Equal(todoItemDto.ItemOrder, updatedTodoItem.ItemOrder);
        }

        [Fact]
        public async Task UpdateTodoItem_WrongId_NotFound()
        {
            var todoItemDto = new TodoItemDto()
            {
                Title = "title",
                Description = "description v1",
                Status = TodoItemStatus.Todo,
                ItemOrder = "item order"
            };

            // Arrange, prepare a existing todoItem
            var notFoundId = 12345;
            var updateResponse = await Fixture.Client.PutAsJsonAsync($"/todos/items/{notFoundId}", todoItemDto);

            Assert.Equal(HttpStatusCode.NotFound, updateResponse.StatusCode);
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