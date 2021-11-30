using System.Net.Http.Json;
using System.Threading.Tasks;
using PersonHub.Domain.TodoModule.Entities;
using PersonHub.IntegrationTest.Fixtures;
using Xunit;

namespace PersonHub.IntegrationTest.Tests.TodoItems;


public class GetTodoItemTest : TestBaseClass
{
    public GetTodoItemTest(IntegrationTestClassFixture fixture) : base(fixture)
    {
    }

    [Fact]
    public async Task GetTodoItem_ValidId_ShouldSuccess()
    {
        var todoItemEntity = TodoItemTestHelper.GenerateRandomTodoItemEntity();

        // Arrange, prepare a existing todoItem
        var addedItemId = await this.Fixture.TodoItemDataAccess.Insert(todoItemEntity);

        // Act
        var responseTodoItem = await Fixture.Client.GetFromJsonAsync<TodoItem>($"/todos/items/{addedItemId}");

        Assert.NotNull(responseTodoItem);

        TodoItemTestHelper.AssertEqual(todoItemEntity, responseTodoItem);
    }
}