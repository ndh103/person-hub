using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace PersonHub.IntegrationTest.Stubs;

public class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public static string TestUserEmail = "testuser@gmail.com";

    public TestAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger, UrlEncoder encoder, ISystemClock clock)
        : base(options, logger, encoder, clock)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var emailClaimType = "https://custom-claim/email";

        var claims = new[] {
                new Claim(ClaimTypes.Name, "Test user"),
                new Claim(emailClaimType, TestUserEmail)
            };
        var identity = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, "Test");

        var result = AuthenticateResult.Success(ticket);

        return Task.FromResult(result);
    }
}