using System.Net.Http.Json;
using System.Threading.Tasks;
using PersonHub.Api.Areas.Todos.Models;
using PersonHub.IntegrationTest.Fixtures;
using Xunit;

namespace PersonHub.IntegrationTest.Tests.TodoItems;


public class UpdateTodoItemTest : TestBaseClass
{
    public UpdateTodoItemTest(IntegrationTestClassFixture fixture) : base(fixture)
    {
    }

    [Fact]
    public async Task UpdateTodoItem_ValidItem_ShouldSuccess()
    {
        var item = TodoItemTestHelper.GenerateRandomTodoItemEntity();
        var addedItemId = await this.Fixture.TodoItemDataAccess.Insert(item);

        // Act, upate the existing todoItem
        var todoItemRequestDto = new TodoItemDto()
        {
            Title = "new title",
            Description = "new description",
            ItemOrder = "new item order",
            Status = item.Status,
            Type = item.Type
        };

        var updateResponse = await Fixture.Client.PutAsJsonAsync($"/todos/items/{addedItemId}", todoItemRequestDto);
        updateResponse.EnsureSuccessStatusCode();

        // Assert
        var dbItem = await this.Fixture.TodoItemDataAccess.Get(addedItemId);

        TodoItemTestHelper.AssertEqual(todoItemRequestDto, dbItem);
    }
}