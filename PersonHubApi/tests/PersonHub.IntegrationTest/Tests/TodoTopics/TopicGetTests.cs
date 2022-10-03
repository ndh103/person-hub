using System.Collections.Generic;
using System.Linq;
using System.Net.Http.Json;
using System.Threading.Tasks;
using PersonHub.Domain.TodoModule.Entities;
using PersonHub.IntegrationTest.Fixtures;
using Xunit;

namespace PersonHub.IntegrationTest.Tests.TodoItems;


public class TopicGetTests : TestBaseClass
{
    public TopicGetTests(IntegrationTestClassFixture fixture) : base(fixture)
    {
    }

    [Fact]
    public async Task GetAllTopic_HasTopics_ShouldSuccess()
    {
        // Preapare 5 existing topics
        var topics = new List<TodoTopic>();
        for (int i = 0; i < 5; i++)
        {
            var topicDto = TodoItemTestHelper.GenerateRandomTopicDto();
            var addedTopic = await RestHelper.PostNewTopic(Fixture.Client, topicDto);

            topics.Add(addedTopic);
        }

        var resultTopics = await Fixture.Client.GetFromJsonAsync<List<TodoTopic>>($"/todos/topics");

        // Count also for existing topics in the database
        Assert.True(resultTopics.Count >= 5);

        foreach (var topic in topics)
        {
            Assert.True(resultTopics.Single(r => r.Name == topic.Name && r.Order == topic.Order) != null);
        }

        Assert.True(resultTopics.All(r => r.CreatedDate != null), "CreatedDate is not set");
    }
}
