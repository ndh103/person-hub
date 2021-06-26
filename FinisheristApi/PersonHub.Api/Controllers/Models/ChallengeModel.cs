using System;
using PersonHub.Core.Common.Enum;

namespace PersonHub.Api.Controllers.Models
{
    public class ChallengeModel
    {
        public string Title { get; set; }

        public string Description { get; set; }

        public ChallengeStatus Status { get; set; }
    }
}
    

