using System.Threading.Tasks;
using PersonHub.IntegrationTest.Fixtures;
using Xunit;

namespace PersonHub.IntegrationTest.Tests.TodoItems;


public class DeleteTodoItemTest : TestBaseClass
{
    public DeleteTodoItemTest(IntegrationTestClassFixture fixture) : base(fixture)
    {
    }

    [Fact]
    public async Task DeleteTodoItemTest_ValidItem_ShouldSuccess()
    {
        // Arrange, prepare a existing todoItem
        var todoItemEntity = TodoItemTestHelper.GenerateRandomTodoItemEntity();
        var addedItemId = await this.Fixture.TodoItemDataAccess.Insert(todoItemEntity);

        // Act
        var response = await Fixture.Client.DeleteAsync($"/todos/items/{addedItemId}");
        response.EnsureSuccessStatusCode();

        // Assert
        var dbItem = await this.Fixture.TodoItemDataAccess.GetTodoItem(addedItemId);
        Assert.Null(dbItem);
    }
}