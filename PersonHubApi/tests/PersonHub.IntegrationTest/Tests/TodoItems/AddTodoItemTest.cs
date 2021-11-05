using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using PersonHub.Api.Areas.Todos.Models;
using PersonHub.Domain.TodoModule.Entities;
using PersonHub.IntegrationTest.Fixtures;
using Xunit;

namespace PersonHub.IntegrationTest.Tests.TodoItems
{

    public class AddTodoItemTest : TestBaseClass
    {
        public AddTodoItemTest(IntegrationTestClassFixture fixture) : base(fixture)
        {
        }

        [Fact]
        public async Task AddTodoItem_ValidItem_ShouldSuccess()
        {
            //Act
            var todoItemDto = TodoItemTestHelper.GenerateRandomTodoItemDto();
            var response = await Fixture.Client.PostAsJsonAsync("/todos/items", todoItemDto);
            response.EnsureSuccessStatusCode();
            var addedItem = await response.Content.ReadFromJsonAsync<TodoItem>();

            var dbItem = await this.Fixture.TodoItemDataAccess.Get(addedItem.Id);

            Assert.True(dbItem.Id > 0);
            TodoItemTestHelper.AssertEqual(todoItemDto, dbItem);
            Assert.True(dbItem.CreatedDate != null, "CreatedDate is not set");
        }
    }
}