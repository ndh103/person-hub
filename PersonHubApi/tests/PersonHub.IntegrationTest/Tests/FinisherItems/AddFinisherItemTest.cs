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
    public class AddFinisherItemTest : TestBaseClass
    {
        public AddFinisherItemTest(IntegrationTestClassFixture fixture) : base(fixture)
        {
        }

        [Fact]
        public async Task AddFinisherItem_ValidItem_ShouldSuccess()
        {
            var validItem = FinsiherItemTestHelper.CreateFinisherItemRequestDto();

            var response = await Fixture.Client.PostAsJsonAsync("/finisher/items", validItem);
            response.EnsureSuccessStatusCode();

            var addedItem = await response.Content.ReadFromJsonAsync<FinisherItem>();

            var dbItem = await Fixture.Client.GetFromJsonAsync<FinisherItem>($"/finisher/items/{addedItem.Id}");

            Assert.NotNull(dbItem);

            FinsiherItemTestHelper.AssertCompare(validItem, dbItem);
        }

        [Theory]
        [MemberData(nameof(InvalidFinisherItemData))]
        public async Task AddFinisherItem_InvalidItem_ShouldFail(FinisherItemRequestDto requestDto)
        {
            var response = await Fixture.Client.PostAsJsonAsync("/finisher/items", requestDto);
            
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
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