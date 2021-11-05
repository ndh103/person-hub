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
    public class QueryFinisherItemTest : TestBaseClass
    {
        public QueryFinisherItemTest(IntegrationTestClassFixture fixture) : base(fixture)
        {
        }

        [Fact]
        public async Task QueryFinisherItemTest_HasData_ShouldSuccess()
        {
            // Arrange, add finisher item
            var item = FinsiherItemTestHelper.CreateFinisherItemEntity();
            var addedItemId = await this.Fixture.FinisherItemDataAccess.InsertAsync(item);

            // Arrange, added log to the item
            var itemLogRequest = FinsiherItemTestHelper.CreateFinisherItemLogEntity(addedItemId);
            var addedLog = await this.Fixture.FinisherItemDataAccess.InsertLogAsync(itemLogRequest);

            var query = new QueryFinisherItemRequestDto()
            {
                Limit = 100,
                Offset = 0,
                Status = item.Status
            };

            var queryResponse = await Fixture.Client.PostAsJsonAsync($"/finisher/items/query", query);
            queryResponse.EnsureSuccessStatusCode();

            var resultItems = await queryResponse.Content.ReadFromJsonAsync<List<FinisherItem>>();

            Assert.NotNull(resultItems);
            Assert.True(resultItems.Count() >= 1);

            var dbItem  = resultItems.FirstOrDefault(r => r.Id == addedItemId);

            FinsiherItemTestHelper.AssertCompare(item, dbItem);

            Assert.True(dbItem.Logs.Count == 0, "Should not include Logs");
        }

        //TODO: test pagination with limit and offset
    }
}