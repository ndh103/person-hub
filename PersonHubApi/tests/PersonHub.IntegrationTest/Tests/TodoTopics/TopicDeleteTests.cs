using System.Net.Http.Json;
using System.Threading.Tasks;
using PersonHub.Domain.TodoModule.Entities;
using PersonHub.IntegrationTest.Fixtures;
using Xunit;

namespace PersonHub.IntegrationTest.Tests.TodoItems;


public class TopicDeleteTests : TestBaseClass
{
    public TopicDeleteTests(IntegrationTestClassFixture fixture) : base(fixture)
    {
    }

    [Fact]
    public async Task DeleteTopicTest_HasTopic_ShouldSuccess()
    {
        // First create toipic
        var topicDto = TodoItemTestHelper.GenerateRandomTopicDto();
        var addedTopic = await RestHelper.PostNewTopic(Fixture.Client, topicDto);

        var deleteResponse = await Fixture.Client.DeleteAsync($"/todos/topics/{addedTopic.Id}");
        deleteResponse.EnsureSuccessStatusCode();

        var dbItem = await this.Fixture.TodoItemDataAccess.GetTopic(addedTopic.Id);

        Assert.Null(dbItem);
    }
}
