using System.Text.RegularExpressions;

namespace PersonHub.Api.Common.Utilities
{
    public class UrlUtilities
    {
        public static bool IsValidUrl(string url)
        {
            if(string.IsNullOrWhiteSpace(url)){
                return false;
            }

            Uri uriResult;
            bool result = Uri.TryCreate(url, UriKind.Absolute, out uriResult)
                && (uriResult.Scheme == Uri.UriSchemeHttp || uriResult.Scheme == Uri.UriSchemeHttps);

            return result;
        }

        public static async Task<string> GetWebsiteTileAsync(string url)
        {
            try
            {
                using var client = new HttpClient();
                client.Timeout = TimeSpan.FromSeconds(15);

                var content = await client.GetStringAsync(url);

                var match = Regex.Match(content, @"\<title\b[^>]*\>\s*(?<Title>[\s\S]*?)\</title\>", RegexOptions.IgnoreCase);
                string title = match.Groups["Title"].Value;
                return title;

            }
            catch (Exception ex)
            {
                return String.Empty;
            }
        }
    }
}