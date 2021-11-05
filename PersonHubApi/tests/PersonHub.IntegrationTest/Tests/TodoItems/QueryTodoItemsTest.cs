using System.Collections.Generic;
using System.Linq;
using System.Net.Http.Json;
using System.Threading.Tasks;
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
            var todoItemEntity = TodoItemTestHelper.GenerateRandomTodoItemEntity();

            // Arrange, prepare a existing todoItem
            var addedItemId = await this.Fixture.TodoItemDataAccess.Insert(todoItemEntity);

            // Act
            var todoItems = await Fixture.Client.GetFromJsonAsync<List<TodoItem>>($"/todos/items/status/{(int)TodoItemStatus.Todo}");

            var foundItem = todoItems.FirstOrDefault(r => r.Id == addedItemId);
            Assert.NotNull(foundItem);

            var dbItem = await this.Fixture.TodoItemDataAccess.Get(addedItemId);

            TodoItemTestHelper.AssertEqual(todoItemEntity, foundItem);
        }
    }
}