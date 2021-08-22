using Microsoft.AspNetCore.Mvc.Testing;
using PersonHub.IntegrationTest.Fixtures;
using Xunit;

namespace PersonHub.IntegrationTest.Tests
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