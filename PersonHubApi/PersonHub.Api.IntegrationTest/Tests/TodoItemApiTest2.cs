using System.Net;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using PersonHub.Api.IntegrationTest.Fixtures;
using Xunit;

namespace PersonHub.Api.IntegrationTest.Tests
{
    [Collection("Test collection")]

    public class TodoItemApiTest2 : TestBaseClass
    {
        public TodoItemApiTest2(IntegrationTestClassFixture fixture): base(fixture)
        {
        }

        [Fact]
        public async Task Test2()
        {
            var response = await Fixture.Client.GetAsync("/todos/items/status/0");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }
}