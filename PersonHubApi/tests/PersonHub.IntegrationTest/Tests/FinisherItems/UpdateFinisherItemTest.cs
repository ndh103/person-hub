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
    public class UpdateFinisherItemTest : TestBaseClass
    {
        public UpdateFinisherItemTest(IntegrationTestClassFixture fixture) : base(fixture)
        {
        }

        [Fact]
        public async Task UpdateFinisherPlanningItem_ValidData_ShouldSuccess()
        {
            // Arrange, exisiting item
            var item = FinsiherItemTestHelper.CreateFinisherItemEntity();
            item.Status = FinisherItemStatus.Planning;
            
            var addedItemId = await this.Fixture.FinisherItemDataAccess.InsertAsync(item);

            // Act, update the existing item
            var updateRequestDto = FinsiherItemTestHelper.CreateFinisherItemRequestDto();

            // Not changing status and StartDate, just update title, Description and tags
            updateRequestDto.Status = FinisherItemStatus.Planning;
            updateRequestDto.StartDate = null;

            var updateResponse = await Fixture.Client.PutAsJsonAsync($"/finisher/items/{addedItemId}", updateRequestDto);
            updateResponse.EnsureSuccessStatusCode();

            var dbItem = await this.Fixture.FinisherItemDataAccess.GetFinisherItemAsync(addedItemId);

            Assert.NotNull(dbItem);

            FinsiherItemTestHelper.AssertCompare(updateRequestDto, dbItem);
        }

        [Fact]
        public async Task StartAnItem_ValidData_ShouldSuccess()
        {
            // Arrange, exisiting item
            var item = FinsiherItemTestHelper.CreateFinisherItemEntity();
            item.Status = FinisherItemStatus.Planning;

            var addedItemId = await this.Fixture.FinisherItemDataAccess.InsertAsync(item);

            // Act, update the existing item
            var startActionRequest = new StartItemActionRequestDto(){
                StartDate = DateTime.UtcNow
            };
            
            var startActionResponse = await Fixture.Client.PostAsJsonAsync($"/finisher/items/{addedItemId}/start", startActionRequest);
            startActionResponse.EnsureSuccessStatusCode();

            var dbItem = await this.Fixture.FinisherItemDataAccess.GetFinisherItemAsync(addedItemId);

            Assert.NotNull(dbItem);

            Assert.Equal(FinisherItemStatus.Started, dbItem.Status);
            Assert.True(TestHelper.EqualsUpToSeconds(startActionRequest.StartDate, dbItem.StartDate.Value));
        }

        [Fact]
        public async Task FinishAnItem_ValidData_ShouldSuccess()
        {
            // Arrange, exisiting item
            var item = FinsiherItemTestHelper.CreateFinisherItemEntity();
            item.Status = FinisherItemStatus.Planning;

            var addedItemId = await this.Fixture.FinisherItemDataAccess.InsertAsync(item);

            //Arrange, start the item
            var startActionRequest = new StartItemActionRequestDto(){
                StartDate = DateTime.UtcNow
            };
            
            var startActionResponse = await Fixture.Client.PostAsJsonAsync($"/finisher/items/{addedItemId}/start", startActionRequest);
            startActionResponse.EnsureSuccessStatusCode();

            // Act, finish the item
            var finishActionRequest = new FinishItemActionRequestDto(){
                FinishDate = DateTime.UtcNow
            };
            var finishActionResponse = await Fixture.Client.PostAsJsonAsync($"/finisher/items/{addedItemId}/finish", finishActionRequest);
            finishActionResponse.EnsureSuccessStatusCode();

            var dbItem = await this.Fixture.FinisherItemDataAccess.GetFinisherItemAsync(addedItemId);

            Assert.NotNull(dbItem);

            Assert.Equal(FinisherItemStatus.Finished, dbItem.Status);
            Assert.True(TestHelper.EqualsUpToSeconds(finishActionRequest.FinishDate, dbItem.StartDate.Value));
        }

        [Fact]
        public async Task UpdateFinisherItemTest_NotExistItem_ShouldFail()
        {
            var validUpdateRequest = FinsiherItemTestHelper.CreateFinisherItemRequestDto();
            var notExistedId = 999;

            // Act
            var updateResponse = await Fixture.Client.PutAsJsonAsync($"/finisher/items/{notExistedId}", validUpdateRequest);

            Assert.Equal(HttpStatusCode.NotFound, updateResponse.StatusCode);
        }
    }
}