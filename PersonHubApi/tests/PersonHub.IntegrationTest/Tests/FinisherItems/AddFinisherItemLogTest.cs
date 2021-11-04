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
            var validItem = FinsiherItemTestHelper.CreateFinisherItemRequestDto();

            var response = await Fixture.Client.PostAsJsonAsync(BaseApiPath, validItem);
            response.EnsureSuccessStatusCode();
            var addedItem = await response.Content.ReadFromJsonAsync<FinisherItem>();

            // Act, add log to the Finisher Item
            var requestLogDto = FinsiherItemTestHelper.CreateFinisherItemLogDto();

            var addLogResponse = await Fixture.Client.PostAsJsonAsync($"{BaseApiPath}/{addedItem.Id}/logs", requestLogDto);
            addLogResponse.EnsureSuccessStatusCode();

            var addedLog = await addLogResponse.Content.ReadFromJsonAsync<FinisherItemLog>();

            var dbItem = await Fixture.Client.GetFromJsonAsync<FinisherItem>($"{BaseApiPath}/{addedItem.Id}");

            Assert.NotNull(dbItem);

            var dbLog = dbItem.Logs.FirstOrDefault();

            Assert.True(dbLog != null, "DbLog is null");
            Assert.True(requestLogDto.Content == dbLog.Content, "Log Content is not matched");
            Assert.True(dbLog.CreatedDate != null, "Log CreatedDate should not be null");
        }

        [Fact]
        public async Task AddFinisherItemLogTest_InvalidItem_ShouldFail()
        {
            // Arrange , create an existing Item
            var validItem = FinsiherItemTestHelper.CreateFinisherItemRequestDto();

            var response = await Fixture.Client.PostAsJsonAsync(BaseApiPath, validItem);
            response.EnsureSuccessStatusCode();
            var addedItem = await response.Content.ReadFromJsonAsync<FinisherItem>();

            // Act, add log to the Finisher Item
            var requestLogDto = FinsiherItemTestHelper.CreateFinisherItemLogDto();
            // Invalid logs, empty content
            requestLogDto.Content = string.Empty;

            var addLogResponse = await Fixture.Client.PostAsJsonAsync($"{BaseApiPath}/{addedItem.Id}/logs", requestLogDto);

            Assert.True(addLogResponse.StatusCode == HttpStatusCode.BadRequest, "The response should be BadRequest");
        }
    }
}