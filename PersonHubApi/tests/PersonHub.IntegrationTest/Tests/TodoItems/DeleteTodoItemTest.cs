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
            var dbItem = await this.Fixture.TodoItemDataAccess.Get(addedItemId);
            Assert.Null(dbItem);
        }
    }
}