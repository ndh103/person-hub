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
            var finisherItemEntity = await dbContext.FinisherItems.Include(r => r.Logs.OrderByDescending(l => l.CreatedDate)).FirstOrDefaultAsync(r => r.UserId == AuthenticatedUserEmail && r.Id == itemId);

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
                                                    .Skip(queryDto.Offset).Take(queryDto.Limit).ToListAsync();

            return resultItems;
        }

        [HttpPost()]
        public async Task<ActionResult<FinisherItem>> Add(FinisherItemRequestDto itemDto, CancellationToken cancellationToken)
        {
            // If Planning, shoud have no Start Date
            var startDate = itemDto.Status != FinisherItemStatus.Planning ? itemDto.StartDate : null;
            var finisherItemEntity = new FinisherItem(AuthenticatedUserEmail, itemDto.Title, itemDto.Description, startDate, itemDto.Tags, itemDto.Status);

            if (finisherItemEntity.HasError())
            {
                return BadRequest(finisherItemEntity.Errors().First());
            }

            await dbContext.FinisherItems.AddAsync(finisherItemEntity);

            await dbContext.SaveChangesAsync();

            return finisherItemEntity;
        }

        [HttpPost("{itemId}/start")]
        public async Task<ActionResult> StartAnItem(int itemId, StartItemActionRequestDto startItemActionRequestDto)
        {
            var finisherItemEntity = await dbContext.FinisherItems.FirstOrDefaultAsync(r => r.UserId == AuthenticatedUserEmail && r.Id == itemId);

            if (finisherItemEntity == null)
            {
                return NotFound();
            }

            finisherItemEntity.Start(startItemActionRequestDto.StartDate);
            if(finisherItemEntity.HasError()){
                return BadRequest(finisherItemEntity.Errors().First());
            }

            await dbContext.SaveChangesAsync();

            return Ok();
        }

        [HttpPost("{itemId}/finish")]
        public async Task<ActionResult> FinishAnItem(int itemId, FinishItemActionRequestDto finishItemActionRequestDto)
        {
            var finisherItemEntity = await dbContext.FinisherItems.FirstOrDefaultAsync(r => r.UserId == AuthenticatedUserEmail && r.Id == itemId);

            if (finisherItemEntity == null)
            {
                return NotFound();
            }

            finisherItemEntity.Finish(finishItemActionRequestDto.FinishDate);
            if(finisherItemEntity.HasError()){
                return BadRequest(finisherItemEntity.Errors().First());
            }

            await dbContext.SaveChangesAsync();

            return Ok();
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
            if (logEntity.HasError())
            {
                return BadRequest(logEntity.Errors().First());
            }

            itemEntity.AddLog(logEntity);

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

            finisherItemEntity.Update(dto.Title, dto.Description, dto.StartDate, dto.Tags);

            if (finisherItemEntity.HasError())
            {
                return BadRequest(finisherItemEntity.Errors().First());
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

            var itemEntity = dbContext.FinisherItems.Include(r => r.Logs).FirstOrDefault(r => r.UserId == AuthenticatedUserEmail && r.Id == itemId);

            if (itemEntity == null)
            {
                return BadRequest("Item not found");
            }

            var logEntity = itemEntity.Logs.FirstOrDefault(r => r.Id == logId);

            if (logEntity == null)
            {
                return BadRequest("Log item not found");
            }

            logEntity.Update(logDto.Content);
            if (logEntity.HasError())
            {
                return BadRequest(logEntity.Errors().First());
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
            var finisherItemEntity = dbContext.FinisherItems.Include(r => r.Logs).FirstOrDefault(r => r.UserId == AuthenticatedUserEmail && r.Id == itemId);

            if (finisherItemEntity == null)
            {
                return NotFound("Item not found");
            }

            finisherItemEntity.RemoveLog(logId);

            if(finisherItemEntity.HasError()){
                return BadRequest(finisherItemEntity.Errors().First());
            }

            await dbContext.SaveChangesAsync();

            return Ok();
        }
    }
}