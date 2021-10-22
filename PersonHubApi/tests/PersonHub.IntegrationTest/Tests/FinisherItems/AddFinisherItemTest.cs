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
        public async Task AddFinisherItem_PlanningItem_ShouldSuccess()
        {
            var validItem = FinsiherItemTestHelper.CreateFinisherItemRequestDto();
            validItem.Status = FinisherItemStatus.Planning;

            var response = await Fixture.Client.PostAsJsonAsync("/finisher/items", validItem);
            response.EnsureSuccessStatusCode();

            var addedItem = await response.Content.ReadFromJsonAsync<FinisherItem>();

            var dbItem = await Fixture.Client.GetFromJsonAsync<FinisherItem>($"/finisher/items/{addedItem.Id}");

            Assert.NotNull(dbItem);

            FinsiherItemTestHelper.AssertCompare(validItem, dbItem);

            // Planning Item should not have start date
            Assert.Null(dbItem.StartDate);
        }

        [Fact]
        public async Task AddFinisherItem_StartedItem_ShouldSuccess()
        {
            var validItem = FinsiherItemTestHelper.CreateFinisherItemRequestDto();
            validItem.Status = FinisherItemStatus.Started;

            var response = await Fixture.Client.PostAsJsonAsync("/finisher/items", validItem);
            response.EnsureSuccessStatusCode();

            var addedItem = await response.Content.ReadFromJsonAsync<FinisherItem>();

            var dbItem = await Fixture.Client.GetFromJsonAsync<FinisherItem>($"/finisher/items/{addedItem.Id}");

            Assert.NotNull(dbItem);

            FinsiherItemTestHelper.AssertCompare(validItem, dbItem);

            // Started Item should have start date
            Assert.True(TestHelper.EqualsUpToSeconds(validItem.StartDate.Value, dbItem.StartDate.Value), $"StartDate is not equal.");
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