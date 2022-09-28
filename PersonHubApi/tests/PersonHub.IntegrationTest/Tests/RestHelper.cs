using System;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using PersonHub.Api.Areas.Todos.Models;
using PersonHub.Domain.TodoModule.Entities;
using PersonHub.IntegrationTest.Tests.TodoItems;

namespace PersonHub.IntegrationTest.Tests;

public static class RestHelper
{
    public static async Task<TodoTopic> PostNewTopic(HttpClient client, TodoTopicDto topic)
    {
        var createTopicResponse = await client.PostAsJsonAsync("/todos/topics", topic);
        createTopicResponse.EnsureSuccessStatusCode();
        var addedTopic = await createTopicResponse.Content.ReadFromJsonAsync<TodoTopic>();

        return addedTopic;
    }

    public static async Task<TodoItem> PostNewTodoItem(HttpClient client, TodoItemDto todoItemDto)
    {
        var response = await client.PostAsJsonAsync("/todos/items", todoItemDto);
        response.EnsureSuccessStatusCode();
        var addedItem = await response.Content.ReadFromJsonAsync<TodoItem>();

        return addedItem;
    }
}