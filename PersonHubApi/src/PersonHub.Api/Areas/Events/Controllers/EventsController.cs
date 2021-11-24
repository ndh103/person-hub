using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using PersonHub.Api.Areas.Events.Models;
using PersonHub.Api.Common;
using PersonHub.Domain.EventsModule.Entities;
using PersonHub.Domain.Interfaces;
using PersonHub.Infrastructure.DataAccess;
using System.Linq;
using Microsoft.EntityFrameworkCore;

namespace PersonHub.Api.Areas.LifeEvents.Controllers
{
    [ApiController]
    [Route("life-events/[controller]")]
    [Authorize]
    public class EventsController : ApiControllerBase
    {
        private const int PaginationMaxItem = 100;

        private readonly PersonHubDbContext dbContext;

        public EventsController(PersonHubDbContext dbContext)
        {
            this.dbContext = dbContext;
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Event>> Get(long id)
        {
            var eventEntity = await dbContext.Events.FirstOrDefaultAsync(r => r.UserId == AuthenticatedUserEmail && r.Id == id);

            if (eventEntity == null)
            {
                return NotFound();
            }

            return eventEntity;
        }


        [HttpPost("query")]
        public async Task<ActionResult<IEnumerable<Event>>> Query(QueryEventRequestDto dto, CancellationToken cancellationToken)
        {
            if (dto == null)
            {
                return BadRequest("Query information is required");
            }

            if (dto.Limit > PaginationMaxItem)
            {
                return BadRequest($"Maximum number of return records is {PaginationMaxItem}");
            }

            if (dto.Offset < 0)
            {
                return BadRequest("Offsets must be greater than or equal to zero");
            }

            //TODO: refactor using Dapper for query instead of using ef core
            var result = await dbContext.Events.Where(r => r.UserId == AuthenticatedUserEmail).OrderByDescending(r => r.EventDate).Skip(dto.Offset).Take(dto.Limit).ToListAsync();
            return result;
        }

        [HttpPost()]
        public async Task<ActionResult<Event>> AddEvent(EventRequestDto dto, CancellationToken cancellationToken)
        {
            if (string.IsNullOrEmpty(dto.Title))
            {
                return BadRequest("Title is required");
            }

            if (dto.EventDate == null)
            {
                return BadRequest("EventDate is required");
            }

            var eventEntity = new Event(AuthenticatedUserEmail, dto.Title, dto.Description, dto.EventDate.Value, dto.Tags);

            await dbContext.Events.AddAsync(eventEntity);

            await dbContext.SaveChangesAsync();

            return eventEntity;
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateEvent(int id, EventRequestDto dto, CancellationToken cancellationToken)
        {
            if (string.IsNullOrEmpty(dto.Title))
            {
                return BadRequest("Title is required");
            }

            if (dto.EventDate == null)
            {
                return BadRequest("EventDate is required");
            }

            var eventEntity = await dbContext.Events.FirstOrDefaultAsync(r => r.UserId == AuthenticatedUserEmail && r.Id == id);

            //TODO: move to update function inside model
            eventEntity.Title = dto.Title;
            eventEntity.Description = dto.Description;
            eventEntity.EventDate = dto.EventDate.Value.ToUniversalTime();
            eventEntity.Tags = dto.Tags;

            eventEntity.EnsureValidState();

            dbContext.Events.Update(eventEntity);
            await dbContext.SaveChangesAsync();

            return Ok();
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(int id)
        {
            var eventEntity = await dbContext.Events.FirstOrDefaultAsync(r => r.UserId == AuthenticatedUserEmail && r.Id == id);

            if (eventEntity == null)
            {
                return BadRequest("Event not found");
            }

            dbContext.Events.Remove(eventEntity);
            await dbContext.SaveChangesAsync();

            return Ok();
        }
    }
}