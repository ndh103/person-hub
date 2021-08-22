using System.Net;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using PersonHub.IntegrationTest.Fixtures;
using Xunit;

namespace PersonHub.IntegrationTest.Tests
{
    [Collection("Test collection")]

    public class TodoItemApiTest : TestBaseClass
    {
        public TodoItemApiTest(IntegrationTestClassFixture fixture): base(fixture)
        {
        }

        [Fact]
        public async Task Test1()
        {
            var response = await Fixture.Client.GetAsync("/todos/items/status/0");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }
}