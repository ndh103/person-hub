using System;
using System.Collections.Generic;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using IdentityServer4;
using IdentityModel;

namespace PersonHub.Api.Controllers
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
