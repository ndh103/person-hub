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
    [Collection("Test collection")]
    public class UpdateFinisherItemTest : TestBaseClass
    {
        public UpdateFinisherItemTest(IntegrationTestClassFixture fixture) : base(fixture)
        {
        }

        [Fact]
        public async Task UpdateFinisherItemTest_ValidItem_ShouldSuccess()
        {
            // Arrange, exisiting item
            var validItem = FinsiherItemTestHelper.CreateFinisherItemRequestDto();
            var response = await Fixture.Client.PostAsJsonAsync("/finisher/items", validItem);
            response.EnsureSuccessStatusCode();

            var addedItem = await response.Content.ReadFromJsonAsync<FinisherItem>();

            // Act, update the existing item
            var updateRequestDto = FinsiherItemTestHelper.CreateFinisherItemRequestDto();
            updateRequestDto.Title = "updated title";
            updateRequestDto.Description = "updated desc";
            updateRequestDto.Status = FinisherItemStatus.Finished;
            updateRequestDto.FinishDate = DateTime.Now;

            var updateResponse = await Fixture.Client.PutAsJsonAsync($"/finisher/items/{addedItem.Id}", updateRequestDto);
            updateResponse.EnsureSuccessStatusCode();

            var dbItem = await Fixture.Client.GetFromJsonAsync<FinisherItem>($"/finisher/items/{addedItem.Id}");

            Assert.NotNull(dbItem);

            FinsiherItemTestHelper.AssertCompare(updateRequestDto, dbItem);
        }

        [Theory]
        [MemberData(nameof(InvalidFinisherItemData))]
        public async Task UpdateFinisherItemTest_InvalidItem_ShouldFail(FinisherItemRequestDto requestDto)
        {
            // Arrange, exisiting item
            var validItem = FinsiherItemTestHelper.CreateFinisherItemRequestDto();
            var response = await Fixture.Client.PostAsJsonAsync("/finisher/items", validItem);
            response.EnsureSuccessStatusCode();

            var addedItem = await response.Content.ReadFromJsonAsync<FinisherItem>();

            // Act
            var updateResponse = await Fixture.Client.PutAsJsonAsync($"/finisher/items/{addedItem.Id}", requestDto);

            Assert.Equal(HttpStatusCode.BadRequest, updateResponse.StatusCode);
        }

        [Fact]
        public async Task UpdateFinisherItemTest_NotExistItem_ShouldFail()
        {
            var validItem = FinsiherItemTestHelper.CreateFinisherItemRequestDto();

            var notExistedId = 999;

            // Act
            var updateResponse = await Fixture.Client.PutAsJsonAsync($"/finisher/items/{notExistedId}", validItem);

            Assert.Equal(HttpStatusCode.NotFound, updateResponse.StatusCode);
        }


        public static IEnumerable<object[]> InvalidFinisherItemData()
        {
            var missingTitleItem = FinsiherItemTestHelper.CreateFinisherItemRequestDto();
            missingTitleItem.Title = string.Empty;

            yield return new object[] { missingTitleItem };

            var outOfRangeStatusItem = FinsiherItemTestHelper.CreateFinisherItemRequestDto();
            outOfRangeStatusItem.Status = (FinisherItemStatus)(TestHelper.GetMaxValueOfEnum<FinisherItemStatus>() + 1);

            yield return new object[] { outOfRangeStatusItem };
        }
    }
}