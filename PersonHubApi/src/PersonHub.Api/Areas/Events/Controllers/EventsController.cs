using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PersonHub.Api.Areas.Events.Models;
using PersonHub.Api.Common;
using PersonHub.Domain.EventsModule.Entities;
using PersonHub.Infrastructure.DataAccess;
using Microsoft.EntityFrameworkCore;
using PersonHub.Domain.EventsModule.Queries;

namespace PersonHub.Api.Areas.LifeEvents.Controllers;

[ApiController]
[Route("life-events/[controller]")]
[Authorize]
public class EventsController : ApiControllerBase
{
    private const int PaginationMaxItem = 100;

    private readonly PersonHubDbContext dbContext;
    private readonly IGetTopTagsQuery getTopTagsQuery;

    public EventsController(PersonHubDbContext dbContext, IGetTopTagsQuery getTopTagsQuery)
    {
        this.dbContext = dbContext;
        this.getTopTagsQuery = getTopTagsQuery;
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

    [HttpGet("tags/tops/{limit}")]
    public async Task<ActionResult<IEnumerable<string>>> QueryEventTopTags(int limit)
    {
        var tags = await getTopTagsQuery.QueryAsync(AuthenticatedUserEmail, limit);
        return tags.ToList();
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

        var query = dbContext.Events.Where(r => r.UserId == AuthenticatedUserEmail);

        if(dto.Tags != null && dto.Tags.Length > 0){
            query = query.Where(r=>r.Tags != null && r.Tags.Any(tag => dto.Tags.Contains(tag)));
        }

        // Order and pagination
        var result = await query.OrderByDescending(r => r.EventDate).Skip(dto.Offset).Take(dto.Limit).ToListAsync();

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
