using Microsoft.AspNetCore.Mvc.Testing;
using PersonHub.Api.IntegrationTest.Fixtures;
using Xunit;

namespace PersonHub.Api.IntegrationTest.Tests
{
    [CollectionDefinition("Database collection")]
    public class TestBaseClass
    {
        protected IntegrationTestClassFixture Fixture { get; }
        public TestBaseClass(IntegrationTestClassFixture fixture)
        {
            this.Fixture = fixture;
        }
    }
}