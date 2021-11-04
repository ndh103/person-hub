using Microsoft.AspNetCore.Mvc.Testing;
using PersonHub.IntegrationTest.Fixtures;
using Xunit;

namespace PersonHub.IntegrationTest.Tests
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