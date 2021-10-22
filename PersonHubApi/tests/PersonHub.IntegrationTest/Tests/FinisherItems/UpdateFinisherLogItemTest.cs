using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using PersonHub.Api.Areas.FinisherItems.Models;
using PersonHub.Domain.FinisherModule;
using PersonHub.IntegrationTest.Fixtures;
using Xunit;

namespace PersonHub.IntegrationTest.Tests.FinisherItems
{
    [Collection("Test collection")]
    public class UpdateFinisherLogItemTest : TestBaseClass
    {
        public UpdateFinisherLogItemTest(IntegrationTestClassFixture fixture) : base(fixture)
        {
        }

        [Fact]
        public async Task UpdateFinisherLogItemTest_ValidItem_ShouldSuccess()
        {
            // Arrange, exisiting item
            var validItem = FinsiherItemTestHelper.CreateFinisherItemRequestDto();
            var response = await Fixture.Client.PostAsJsonAsync("/finisher/items", validItem);
            response.EnsureSuccessStatusCode();
            
            var addedItem = await response.Content.ReadFromJsonAsync<FinisherItem>();

            // Add log
            var itemLogRequest = FinsiherItemTestHelper.CreateFinisherItemLogDto();
            var addLogResponse = await Fixture.Client.PostAsJsonAsync($"/finisher/items/{addedItem.Id}/logs", itemLogRequest);
            addLogResponse.EnsureSuccessStatusCode();

            var addedLog = await addLogResponse.Content.ReadFromJsonAsync<FinisherItemLog>();

            // Act, update log
            var updateLogRequest = FinsiherItemTestHelper.CreateFinisherItemLogDto();
            var updateLogResponse = await Fixture.Client.PutAsJsonAsync($"/finisher/items/{addedItem.Id}/logs/{addedLog.Id}", updateLogRequest);

            updateLogResponse.EnsureSuccessStatusCode();

            // Assert
            var dbItem = await Fixture.Client.GetFromJsonAsync<FinisherItem>($"/finisher/items/{addedItem.Id}");

            var dbLog = dbItem.Logs.FirstOrDefault();

            Assert.True(dbLog.Content == updateLogRequest.Content, "Item Log Content does not match");
        }
    }
}