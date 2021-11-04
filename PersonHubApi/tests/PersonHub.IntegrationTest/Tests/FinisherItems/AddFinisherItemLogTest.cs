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
    public class AddFinisherItemLogTest : TestBaseClass
    {
        private const string BaseApiPath = "/finisher/items";

        public AddFinisherItemLogTest(IntegrationTestClassFixture fixture) : base(fixture)
        {
        }

        [Fact]
        public async Task AddFinisherItemLogTest_ValidItem_ShouldSuccess()
        {
            // Arrange , create an existing Item
            var item = FinsiherItemTestHelper.CreateFinisherItemEntity();
            var addedId = await this.Fixture.FinisherItemDataAccess.InsertAsync(item);

            // Act, add log to the Finisher Item
            var requestLogDto = FinsiherItemTestHelper.CreateFinisherItemLogDto();
            var addLogResponse = await Fixture.Client.PostAsJsonAsync($"{BaseApiPath}/{addedId}/logs", requestLogDto);
            addLogResponse.EnsureSuccessStatusCode();

            var addedLog = await addLogResponse.Content.ReadFromJsonAsync<FinisherItemLog>();

            var dbItem = await this.Fixture.FinisherItemDataAccess.GetFinisherItemAsync(addedId);

            var dbItemLogs = await this.Fixture.FinisherItemDataAccess.GetFinisherItemLogsAsync(addedId);

            Assert.NotNull(dbItem);
            Assert.NotNull(dbItemLogs);
            Assert.Equal(1, dbItemLogs.Count());

            Assert.True(requestLogDto.Content == dbItemLogs.First().Content, "Log Content is not matched");
            Assert.True(dbItemLogs.First().CreatedDate != null, "Log CreatedDate should not be null");
        }
    }
}