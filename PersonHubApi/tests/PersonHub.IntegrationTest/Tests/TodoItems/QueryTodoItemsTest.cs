using System.Collections.Generic;
using System.Linq;
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

    public class QueryTodoItemsTest : TestBaseClass
    {
        public QueryTodoItemsTest(IntegrationTestClassFixture fixture) : base(fixture)
        {
        }

         [Fact]
        public async Task QueryByStatus_HasData_ReturnCorrectData()
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
            var todoItems = await Fixture.Client.GetFromJsonAsync<List<TodoItem>>($"/todos/items/status/{(int)TodoItemStatus.Todo}");

            var foundItem = todoItems.FirstOrDefault(r => r.Id == addedTodoItem.Id);
            Assert.NotNull(foundItem);

            Assert.Equal(addedTodoItem.Id, foundItem.Id);
            Assert.Equal(todoItemDto.Title, foundItem.Title);
            Assert.Equal(todoItemDto.Description, foundItem.Description);
            Assert.Equal(todoItemDto.Status, foundItem.Status);
            Assert.Equal(todoItemDto.ItemOrder, foundItem.ItemOrder);
        }

        [Fact]
        public async Task QueryByStatus_NoData_ReturnEmpty()
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
            var todoItems = await Fixture.Client.GetFromJsonAsync<List<TodoItem>>($"/todos/items/status/{(int)TodoItemStatus.Done}");
            
            // Not found the added item because of different status
            Assert.Null(todoItems.FirstOrDefault(r => r.Id == addedTodoItem.Id));
        }

    }
}