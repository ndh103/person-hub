using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Finisherist.Api.Controllers.Models;
using Finisherist.Core.Models;
using Finisherist.Infrastructure.DataAccess;
using IdentityModel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using static IdentityServer4.IdentityServerConstants;

namespace Finisherist.Api.Controllers
{
    [ApiController]
    [Route("[controller]")]
    [Authorize(LocalApi.PolicyName)]
    public class ChallengesController : ApiControllerBase
    {
        private readonly FinisheristDbContext dbContext;

        public ChallengesController(FinisheristDbContext dbContext){
            this.dbContext = dbContext;
        }

        [HttpPost]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<int>> Create(ChallengeModel challengeModel)
        {
            if(!ModelState.IsValid)
            {
                return BadRequest();
            }

            var challenge = new Challenge()
            {
                Title = challengeModel.Title,
                Description = challengeModel.Description,
                Status = challengeModel.Status,
                UserId = this.AuthenticatedUserName
            };

            this.dbContext.Add(challenge);

            await this.dbContext.SaveChangesAsync();

            return challenge.Id;
        }

        [HttpGet()]
        public ActionResult<IEnumerable<Challenge>> GetAll()
        {
            var identity = User.Identity as ClaimsIdentity;

            var claims = from c in identity.Claims
                         select new
                         {
                             subject = c.Subject.Name,
                             type = c.Type,
                             value = c.Value
                         };

            return this.dbContext.Challenges.Where(r => r.UserId == this.AuthenticatedUserName).ToList();
        }

        [HttpDelete("{challengeId}")]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult> DeleteChallenge([FromQuery] int challengeId)
        {
            var challenge = this.dbContext.Challenges.FirstOrDefault(r => r.Id == challengeId && r.UserId == this.AuthenticatedUserName);

            if(challenge == null){
                return NotFound();
            }

            this.dbContext.Challenges.Remove(challenge);
            await this.dbContext.SaveChangesAsync();

            return Ok();
        }

        [HttpPut("{challengeId}")]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateChallenge(int challengeId, ChallengeModel challengeModel)
        {
            if(!ModelState.IsValid){
                return BadRequest();
            }

            var toBeUpdatedChallenge = this.dbContext.Challenges.FirstOrDefault(r => r.Id == challengeId && r.UserId == this.AuthenticatedUserName);

            if(toBeUpdatedChallenge == null){
                return NotFound();
            }

            toBeUpdatedChallenge.Title = challengeModel.Title;
            toBeUpdatedChallenge.Description = challengeModel.Description;
            toBeUpdatedChallenge.Status = challengeModel.Status;

            await this.dbContext.SaveChangesAsync();

            return Ok();
        }
        
    }
}