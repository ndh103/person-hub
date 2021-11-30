using System.Net.Http.Json;
using System.Threading.Tasks;
using PersonHub.Domain.FinisherModule;
using PersonHub.IntegrationTest.Fixtures;
using Xunit;

namespace PersonHub.IntegrationTest.Tests.FinisherItems;

public class AddFinisherItemTest : TestBaseClass
{
    public AddFinisherItemTest(IntegrationTestClassFixture fixture) : base(fixture)
    {
    }

    [Fact]
    public async Task AddFinisherItem_PlanningItem_ShouldSuccess()
    {
        // Act
        var item = FinsiherItemTestHelper.CreateFinisherItemRequestDto();
        item.Status = FinisherItemStatus.Planning;

        var response = await Fixture.Client.PostAsJsonAsync("/finisher/items", item);
        response.EnsureSuccessStatusCode();
        var addedItem = await response.Content.ReadFromJsonAsync<FinisherItem>();

        // Assert
        var dbItem = await this.Fixture.FinisherItemDataAccess.GetFinisherItemAsync(addedItem.Id);

        Assert.NotNull(dbItem);

        FinsiherItemTestHelper.AssertCompare(item, dbItem);

        // Planning Item should not have start date
        Assert.Null(dbItem.StartDate);
    }

    [Fact]
    public async Task AddFinisherItem_StartedItem_ShouldSuccess()
    {
        var item = FinsiherItemTestHelper.CreateFinisherItemRequestDto();
        item.Status = FinisherItemStatus.Started;

        var response = await Fixture.Client.PostAsJsonAsync("/finisher/items", item);
        response.EnsureSuccessStatusCode();
        var addedItem = await response.Content.ReadFromJsonAsync<FinisherItem>();

        // Assert
        var dbItem = await this.Fixture.FinisherItemDataAccess.GetFinisherItemAsync(addedItem.Id);

        Assert.NotNull(dbItem);

        FinsiherItemTestHelper.AssertCompare(item, dbItem);

        // Started Item should have start date
        Assert.True(TestHelper.EqualsUpToSeconds(item.StartDate.Value, dbItem.StartDate.Value), $"StartDate is not equal.");
    }
}