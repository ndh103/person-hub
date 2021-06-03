using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Finisherist.Core.Models;
using Finisherist.Infrastructure.DataAccess;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Finisherist.Api.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class ChallengeController : ControllerBase
    {
        private readonly FinisheristDbContext dbContext;

        public ChallengeController(FinisheristDbContext dbContext){
            this.dbContext = dbContext;
        }

        [HttpPost]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<int>> Create(Challenge challenge)
        {
            if(!ModelState.IsValid)
            {
                return BadRequest();
            }

            this.dbContext.Add(challenge);

            await this.dbContext.SaveChangesAsync();

            return challenge.Id;
        }

        [HttpGet("{userId}")]
        public ActionResult<IEnumerable<Challenge>> GetAll(string userId)
        {
            return this.dbContext.Challenges.Where(r => r.UserId == userId).ToList();
        }

        [HttpDelete("{challengeId}")]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult> DeleteChallenge([FromQuery] int challengeId)
        {
            var challenge = this.dbContext.Challenges.FirstOrDefault(r => r.Id == challengeId);

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
        public async Task<IActionResult> UpdateChallenge(int challengeId, Challenge challenge)
        {
            if(!ModelState.IsValid){
                return BadRequest();
            }

            var toBeUpdatedChallenge = this.dbContext.Challenges.FirstOrDefault(r => r.Id == challengeId);

            if(toBeUpdatedChallenge == null){
                return NotFound();
            }

            toBeUpdatedChallenge.Title = challenge.Title;
            toBeUpdatedChallenge.Description = challenge.Description;
            toBeUpdatedChallenge.Status = challenge.Status;

            await this.dbContext.SaveChangesAsync();

            return Ok();
        }
        
    }
}