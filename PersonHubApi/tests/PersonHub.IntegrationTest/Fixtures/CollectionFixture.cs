using Xunit;

namespace PersonHub.IntegrationTest.Fixtures
{
    public static class CollectionFixtureDefinition{
        public const string Name = "Test collection";
    }

    [CollectionDefinition(CollectionFixtureDefinition.Name)]
    public class DatabaseCollection : ICollectionFixture<IntegrationTestClassFixture>
    {
        // This class has no code, and is never created. Its purpose is simply
        // to be the place to apply [CollectionDefinition] and all the
        // ICollectionFixture<> interfaces.
    }

}