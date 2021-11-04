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
    public class GetFinisherItemTest : TestBaseClass
    {
        public GetFinisherItemTest(IntegrationTestClassFixture fixture) : base(fixture)
        {
        }

        [Fact]
        public async Task GetFinisherItemTest_HasData_ShouldSuccess()
        {
            // Arrange, add finisher item
            var item = FinsiherItemTestHelper.CreateFinisherItemEntity();
            var addedItemId = await this.Fixture.FinisherItemDataAccess.InsertAsync(item);

            // Arrange, added log to the item
            var itemLog = FinsiherItemTestHelper.CreateFinisherItemLogEntity(addedItemId);
            var addedItemLogId = await this.Fixture.FinisherItemDataAccess.InsertLogAsync(itemLog);

            var responseItem = await Fixture.Client.GetFromJsonAsync<FinisherItem>($"/finisher/items/{addedItemId}");

            Assert.NotNull(responseItem);
            FinsiherItemTestHelper.AssertCompare(item, responseItem);

            var dbLog = responseItem.Logs.FirstOrDefault();

            Assert.NotNull(dbLog);
            Assert.True(dbLog.Content == itemLog.Content, "Item Log Content does not match");
        }
    }
}