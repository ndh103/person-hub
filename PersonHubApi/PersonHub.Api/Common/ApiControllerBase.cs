using System;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace PersonHub.Api.Common
{
    public class ApiControllerBase : ControllerBase
    {
        public string AuthenticatedUserEmail
        {
            get
            {
                var value = GetClaimValueFromUserIdentity("email");
                return value;
            }
        }

        private string GetClaimValueFromUserIdentity(string claimType)
        {
            // This is the namespace created by Rules in Auth0
            claimType = "https://custom-claim/" + claimType;

            var identity = HttpContext.User.Identity as ClaimsIdentity;


            if (identity == null)
            {
                return string.Empty;
            }

            return identity.FindFirst(claimType)?.Value;
        }
    }
}