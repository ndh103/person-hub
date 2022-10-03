using System.Net.Http.Json;
using System.Threading.Tasks;
using PersonHub.Domain.TodoModule.Entities;
using PersonHub.IntegrationTest.Fixtures;
using Xunit;

namespace PersonHub.IntegrationTest.Tests.TodoItems;


public class TopicUpdateTests : TestBaseClass
{
    public TopicUpdateTests(IntegrationTestClassFixture fixture) : base(fixture)
    {
    }

    [Fact]
    public async Task UpdateTopicTest_ValidItem_ShouldSuccess()
    {
        // First create toipic
        var topicDto = TodoItemTestHelper.GenerateRandomTopicDto();

        var response = await Fixture.Client.PostAsJsonAsync("/todos/topics", topicDto);
        response.EnsureSuccessStatusCode();
        var addedItem = await response.Content.ReadFromJsonAsync<TodoTopic>();


        var updatedTopicDto = TodoItemTestHelper.GenerateRandomTopicDto();
        var updateResonse = await Fixture.Client.PutAsJsonAsync($"/todos/topics/{addedItem.Id}", updatedTopicDto);
        updateResonse.EnsureSuccessStatusCode();

        var dbItem = await this.Fixture.TodoItemDataAccess.GetTopic(addedItem.Id);

        Assert.True(dbItem.Id > 0);
        TodoItemTestHelper.AssertEqual(updatedTopicDto, dbItem);
        Assert.True(dbItem.CreatedDate != null, "CreatedDate is not set");
    }


}
