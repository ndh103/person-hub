using System.Security.Claims;
using IdentityModel;
using Microsoft.AspNetCore.Mvc;

namespace PersonHub.Api.Common
{
    public class ApiControllerBase : ControllerBase
    {
        public string AuthenticatedUserName
        {
            get
            {
                return GetClaimValueFromUserIdentity(JwtClaimTypes.Subject);
            }
        }

        public string AuthenticatedUserEmail
        {
            get
            {
                return GetClaimValueFromUserIdentity(JwtClaimTypes.Email);
            }
        }

        private string GetClaimValueFromUserIdentity(string claimType)
        {
            var identity = HttpContext.User.Identity as ClaimsIdentity;


            if (identity == null)
            {
                return string.Empty;
            }

            return identity.FindFirst(claimType)?.Value;
        }
    }

}