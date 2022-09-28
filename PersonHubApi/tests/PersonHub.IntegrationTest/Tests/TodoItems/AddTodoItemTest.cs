using System.Net.Http.Json;
using System.Threading.Tasks;
using PersonHub.Domain.TodoModule.Entities;
using PersonHub.IntegrationTest.Fixtures;
using Xunit;

namespace PersonHub.IntegrationTest.Tests.TodoItems;


public class AddTodoItemTest : TestBaseClass
{
    public AddTodoItemTest(IntegrationTestClassFixture fixture) : base(fixture)
    {
    }

    [Fact]
    public async Task AddTodoItem_ValidItemHasTopic_ShouldSuccess()
    {
        // First create toipic
        var topic = TodoItemTestHelper.GenerateRandomTopicDto();
        var addedTopic = await RestHelper.PostNewTopic(Fixture.Client, topic);

        // Create todoItem
        var todoItemDto = TodoItemTestHelper.GenerateRandomTodoItemDto();
        todoItemDto.TopicId = addedTopic.Id;

        var response = await Fixture.Client.PostAsJsonAsync("/todos/items", todoItemDto);
        response.EnsureSuccessStatusCode();
        var addedItem = await response.Content.ReadFromJsonAsync<TodoItem>();

        var dbItem = await this.Fixture.TodoItemDataAccess.GetTodoItem(addedItem.Id);

        Assert.True(dbItem.Id > 0);
        TodoItemTestHelper.AssertEqual(todoItemDto, dbItem);
        Assert.True(dbItem.CreatedDate != null, "CreatedDate is not set");
    }

    [Fact]
    public async Task AddTodoItem_ValidItemNoTopic_ShouldSuccess()
    {
        // Create todoItem
        var todoItemDto = TodoItemTestHelper.GenerateRandomTodoItemDto();

        var response = await Fixture.Client.PostAsJsonAsync("/todos/items", todoItemDto);
        response.EnsureSuccessStatusCode();
        var addedItem = await response.Content.ReadFromJsonAsync<TodoItem>();

        var dbItem = await this.Fixture.TodoItemDataAccess.GetTodoItem(addedItem.Id);

        Assert.True(dbItem.Id > 0);
        TodoItemTestHelper.AssertEqual(todoItemDto, dbItem);
        Assert.True(dbItem.CreatedDate != null, "CreatedDate is not set");
    }   
}
