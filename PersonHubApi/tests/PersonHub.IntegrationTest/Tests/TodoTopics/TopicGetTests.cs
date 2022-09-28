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

    [Fact]
    public async Task GetAllTodoItems_HasData_ShouldSuccess()
    {
        var topicDto = TodoItemTestHelper.GenerateRandomTopicDto();
        var addedTopic = await RestHelper.PostNewTopic(Fixture.Client, topicDto);

        var preparedTodoItems = new List<TodoItem>();

        // Add 5 items link with the Topic
        for (int i = 0; i < 5; i++)
        {
            var todoItemDto = TodoItemTestHelper.GenerateRandomTodoItemDto();
            todoItemDto.TopicId = addedTopic.Id;

            var addedTodoItem = await RestHelper.PostNewTodoItem(Fixture.Client, todoItemDto);

            preparedTodoItems.Add(addedTodoItem);
        }

        // Add one more that does not link with the topic
        var noTopicTodoItemDto = TodoItemTestHelper.GenerateRandomTodoItemDto();
        var noTopicTodoItem = await RestHelper.PostNewTodoItem(Fixture.Client, noTopicTodoItemDto);

        // Act
        var resultTodoItems = await Fixture.Client.GetFromJsonAsync<List<TodoItem>>($"/todos/topics/{addedTopic.Id}/items");

        Assert.Equal(preparedTodoItems.Count, resultTodoItems.Count);

        var isExistNoTopicTodoItem = resultTodoItems.Count(r => r.Id == noTopicTodoItem.Id) == 1;
        Assert.False(isExistNoTopicTodoItem);

        foreach(var preparedTodoItem in preparedTodoItems){
            Assert.True(resultTodoItems.Any(r=>r.Id == preparedTodoItem.Id));
        }
    }

}
