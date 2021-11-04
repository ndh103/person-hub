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
    public class QueryFinisherItemTest : TestBaseClass
    {
        public QueryFinisherItemTest(IntegrationTestClassFixture fixture) : base(fixture)
        {
        }

        [Fact]
        public async Task QueryFinisherItemTest_HasData_ShouldSuccess()
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

            var query = new QueryFinisherItemRequestDto()
            {
                Limit = 100,
                Offset = 0,
                Status = addedItem.Status
            };

            var queryResponse = await Fixture.Client.PostAsJsonAsync($"/finisher/items/query", query);
            queryResponse.EnsureSuccessStatusCode();

            var resultItems = await queryResponse.Content.ReadFromJsonAsync<List<FinisherItem>>();

            Assert.NotNull(resultItems);
            Assert.True(resultItems.Count() >= 1);

            var dbItem  = resultItems.FirstOrDefault(r => r.Id == addedItem.Id);

            FinsiherItemTestHelper.AssertCompare(validItem, dbItem);

            Assert.True(dbItem.Logs.Count == 0, "Should not include Logs");
        }

        //TODO: test pagination with limit and offset
    }
}