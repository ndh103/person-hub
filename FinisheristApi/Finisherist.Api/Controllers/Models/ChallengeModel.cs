using System;
using Finisherist.Core.Common.Enum;

namespace Finisherist.Api.Controllers.Models
{
    public class ChallengeModel
    {
        public string Title { get; set; }

        public string Description { get; set; }

        public ChallengeStatus Status { get; set; }
    }
}
    

