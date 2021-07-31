using Microsoft.AspNetCore.Mvc.Testing;
using PersonHub.Api.IntegrationTest.Fixtures;
using Xunit;

namespace PersonHub.Api.IntegrationTest.Tests
{
    public class TestBaseClass : IClassFixture<IntegrationTestClassFixture>
    {
        protected IntegrationTestClassFixture Fixture { get; }
        public TestBaseClass(IntegrationTestClassFixture fixture)
        {
            this.Fixture = fixture;
        }
    }
}