using System;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using PersonHub.Domain.Entities;

namespace PersonHub.Api.Common
{
    public class ApiControllerBase : ControllerBase
    {
        public string AuthenticatedUserEmail
        {
            get
            {
                var auth0EmailClaimType = "https://custom-claim/email";
                var azureB2CEmailClaimType = "emails";

                var value = GetClaimValueFromUserIdentity(auth0EmailClaimType);

                if(string.IsNullOrEmpty(value)){
                    value = GetClaimValueFromUserIdentity(azureB2CEmailClaimType);
                }

                if(string.IsNullOrEmpty(value)){
                    throw new Exception("Cannot extract email from Claims");
                }

                return value;
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