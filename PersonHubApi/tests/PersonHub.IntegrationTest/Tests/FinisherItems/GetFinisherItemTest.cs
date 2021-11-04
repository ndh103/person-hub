using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using PersonHub.Api.Areas.FinisherItems.Models;
using PersonHub.Domain.FinisherModule;
using PersonHub.IntegrationTest.Fixtures;
using Xunit;

namespace PersonHub.IntegrationTest.Tests.FinisherItems
{
    [Collection(CollectionFixtureDefinition.Name)]
    public class GetFinisherItemTest : TestBaseClass
    {
        public GetFinisherItemTest(IntegrationTestClassFixture fixture) : base(fixture)
        {
        }

        [Fact]
        public async Task GetFinisherItemTest_HasData_ShouldSuccess()
        {
            // Arrange, add finisher item
            var validItem = FinsiherItemTestHelper.CreateFinisherItemRequestDto();

            var response = await Fixture.Client.PostAsJsonAsync("/finisher/items", validItem);
            response.EnsureSuccessStatusCode();
            var addedItem = await response.Content.ReadFromJsonAsync<FinisherItem>();

            // Arrange, added log to the item
            var itemLogRequest = FinsiherItemTestHelper.CreateFinisherItemLogDto();
            var addLogResponse = await Fixture.Client.PostAsJsonAsync($"/finisher/items/{addedItem.Id}/logs", itemLogRequest);
            addLogResponse.EnsureSuccessStatusCode();

            var dbItem = await Fixture.Client.GetFromJsonAsync<FinisherItem>($"/finisher/items/{addedItem.Id}");

            Assert.NotNull(dbItem);
            FinsiherItemTestHelper.AssertCompare(validItem, dbItem);

            var dbLog = dbItem.Logs.FirstOrDefault();

            Assert.NotNull(dbLog);
            Assert.True(dbLog.Content == itemLogRequest.Content, "Item Log Content does not match");
        }
    }
}