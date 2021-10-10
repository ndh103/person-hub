using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PersonHub.Api.Common;
using PersonHub.Infrastructure.DataAccess;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using PersonHub.Domain.FinisherModule;
using System;

namespace PersonHub.Api.Areas.FinisherItems.Models
{
    [ApiController]
    [Route("finisher/items")]
    [Authorize]
    public class FinisherItemsController : ApiControllerBase
    {
        private const int PaginationMaxItem = 100;

        private readonly PersonHubDbContext dbContext;

        public FinisherItemsController(PersonHubDbContext dbContext)
        {
            this.dbContext = dbContext;
        }

        [HttpGet("{itemId}")]
        public async Task<ActionResult<FinisherItem>> Get(long itemId)
        {
            var finisherItemEntity = await dbContext.FinisherItems.Include(r => r.Logs).FirstOrDefaultAsync(r => r.UserId == AuthenticatedUserEmail && r.Id == itemId);

            if (finisherItemEntity == null)
            {
                return NotFound();
            }

            return finisherItemEntity;
        }


        [HttpPost("query")]
        public async Task<ActionResult<IEnumerable<FinisherItem>>> Query(QueryFinisherItemRequestDto queryDto, CancellationToken cancellationToken)
        {
            if (queryDto == null)
            {
                return BadRequest("Query information is required");
            }

            if (queryDto.Limit > PaginationMaxItem)
            {
                return BadRequest($"Maximum number of return records is {PaginationMaxItem}");
            }

            if (queryDto.Offset < 0)
            {
                return BadRequest("Offsets must be greater than or equal to zero");
            }

            var resultItems = await dbContext.FinisherItems.Where(r => r.UserId == AuthenticatedUserEmail)
                                                    .Where(r => r.Status == queryDto.Status)
                                                    .OrderByDescending(r => r.StartDate).Skip(queryDto.Offset).Take(queryDto.Limit).ToListAsync();

            return resultItems;
        }

        [HttpPost()]
        public async Task<ActionResult<FinisherItem>> Add(FinisherItemRequestDto itemDto, CancellationToken cancellationToken)
        {
            var finisherItemEntity = new FinisherItem(AuthenticatedUserEmail, itemDto.Title, itemDto.Description, itemDto.StartDate, itemDto.Tags, itemDto.Status);

            var entityState = finisherItemEntity.CheckValidState();
            if (entityState.HasError)
            {
                return BadRequest(entityState.Errors.First());
            }

            await dbContext.FinisherItems.AddAsync(finisherItemEntity);

            await dbContext.SaveChangesAsync();

            return finisherItemEntity;
        }

        [HttpPost("{itemId}/logs")]
        public async Task<ActionResult<FinisherItemLog>> AddLog(long itemId, FinisherItemLogDto logDto, CancellationToken cancellationToken)
        {
            if (string.IsNullOrEmpty(logDto.Content))
            {
                return BadRequest("Title is required");
            }

            var itemEntity = dbContext.FinisherItems.FirstOrDefault(r => r.UserId == AuthenticatedUserEmail && r.Id == itemId);

            if (itemEntity == null)
            {
                return BadRequest("Log Item not found");
            }

            var logEntity = new FinisherItemLog(itemId, logDto.Content);

            var entityState = logEntity.CheckValidState();
            if (entityState.HasError)
            {
                return BadRequest(entityState.Errors.First());
            }

            itemEntity.Logs.Add(logEntity);

            await dbContext.SaveChangesAsync();

            return logEntity;
        }

        [HttpPut("{itemId}")]
        public async Task<IActionResult> Update(int itemId, FinisherItemRequestDto dto, CancellationToken cancellationToken)
        {
            var finisherItemEntity = await dbContext.FinisherItems.FirstOrDefaultAsync(r => r.UserId == AuthenticatedUserEmail && r.Id == itemId);

            if (finisherItemEntity == null)
            {
                return NotFound();
            }

            finisherItemEntity.Title = dto.Title;
            finisherItemEntity.Description = dto.Description;
            finisherItemEntity.StartDate = dto.StartDate;
            finisherItemEntity.FinishDate = dto.FinishDate;
            finisherItemEntity.Status = dto.Status;
            finisherItemEntity.Tags = dto.Tags;

            var entityState = finisherItemEntity.CheckValidState();
            if (entityState.HasError)
            {
                return BadRequest(entityState.Errors.First());
            }

            dbContext.FinisherItems.Update(finisherItemEntity);
            await dbContext.SaveChangesAsync();

            return Ok();
        }

        [HttpPut("{itemId}/logs/{logId}")]
        public async Task<IActionResult> UpdateLog(int itemId, int logId, FinisherItemLogDto logDto, CancellationToken cancellationToken)
        {
            if (string.IsNullOrEmpty(logDto.Content))
            {
                return BadRequest("Content is required");
            }

            var itemEntity = dbContext.FinisherItems.Include(r=>r.Logs).FirstOrDefault(r => r.UserId == AuthenticatedUserEmail && r.Id == itemId);

            if (itemEntity == null)
            {
                return BadRequest("Item not found");
            }

            var logEntity = itemEntity.Logs.FirstOrDefault(r => r.Id == logId);

            if (logEntity == null)
            {
                return BadRequest("Log item not found");
            }

            logEntity.Content = logDto.Content;
            logEntity.CreatedDate = DateTime.Now;

            var entityState = logEntity.CheckValidState();
            if (entityState.HasError)
            {
                return BadRequest(entityState.Errors.First());
            }

            await dbContext.SaveChangesAsync();

            return Ok();
        }

        [HttpDelete("{itemId}")]
        public async Task<ActionResult> Delete(int itemId)
        {
            var finisherItemEntity = await dbContext.FinisherItems.FirstOrDefaultAsync(r => r.UserId == AuthenticatedUserEmail && r.Id == itemId);

            if (finisherItemEntity == null)
            {
                return NotFound();
            }

            dbContext.FinisherItems.Remove(finisherItemEntity);
            await dbContext.SaveChangesAsync();

            return Ok();
        }

        [HttpDelete("{itemId}/logs/{logId}")]
        public async Task<ActionResult> DeleteLog(int itemId, int logId)
        {
            var finisherItemEntity = dbContext.FinisherItems.Include(r=>r.Logs).FirstOrDefault(r => r.UserId == AuthenticatedUserEmail && r.Id == itemId);

            if (finisherItemEntity == null)
            {
                return NotFound("Item not found");
            }

            var logItem = finisherItemEntity.Logs.FirstOrDefault(r => r.Id == logId);
            if (logItem == null)
            {
                return NotFound("Log Item not found");
            }

            finisherItemEntity.Logs.Remove(logItem);

            await dbContext.SaveChangesAsync();

            return Ok();
        }
    }
}