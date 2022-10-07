using PersonHub.Api.Common.Utilities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Xunit;

namespace PersonHub.UnitTest.Domain.Common
{
    public class UrlUtilitiesTest
    {
        [Fact]
        public async Task GetWebsiteTileAsync_ValidWebsite_ShouldReturnTitle()
        {
            var title = await UrlUtilities.GetWebsiteTileAsync("https://www.google.com/");

            Assert.Equal("Google", title);
        }

        [Fact]
        public async Task GetWebsiteTileAsync_CouldNotGetContent_ShouldReturnEmpty()
        {
            var title = await UrlUtilities.GetWebsiteTileAsync("http://localhost:8080/");

            Assert.Equal(String.Empty, title);
        }
    }
}
