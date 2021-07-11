using System;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace PersonHub.Api.Common
{
    public class ApiControllerBase : ControllerBase
    {
        public string AuthenticatedUserName
        {
            get
            {
                throw new NotImplementedException();
            }
        }

        public string AuthenticatedUserEmail
        {
            get
            {
                throw new NotImplementedException();
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