using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonHub.Api.Areas.Todos.Models;
using PersonHub.Api.Common;
using PersonHub.Api.Common.Utilities;
using PersonHub.Domain.TodoModule.Entities;
using PersonHub.Infrastructure.DataAccess;

namespace PersonHub.Api.Areas.Todos.Controllers;

[ApiController]
[Route("todos/[controller]")]
[Authorize]
public class ItemsController : ApiControllerBase
{
    private readonly PersonHubDbContext dbContext;

    public ItemsController(PersonHubDbContext dbContext)
    {
        this.dbContext = dbContext;
    }

    [HttpPost("")]
    public async Task<ActionResult<TodoItem>> AddTodoItem(TodoItemDto todoItemDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        // Convert to markdown link if the todo is a valid https link
        if(UrlUtilities.IsValidUrl(todoItemDto?.Title)){
            var websiteTitle =  await UrlUtilities.GetWebsiteTileAsync(todoItemDto.Title!);
            if(!string.IsNullOrWhiteSpace(websiteTitle)){
                todoItemDto.Title = $"[{websiteTitle}]({todoItemDto.Title})";
            }
        }

        var todoItemEntity = new TodoItem(AuthenticatedUserEmail, todoItemDto.Title, todoItemDto.Description, todoItemDto.Status, todoItemDto.ItemOrder, todoItemDto.TodoTopicId);
        if (todoItemEntity.HasError())
        {
            return BadRequest(todoItemEntity.Errors().First());
        }

        await dbContext.AddAsync(todoItemEntity);
        await dbContext.SaveChangesAsync();

        return todoItemEntity;
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<TodoItem>> UpdateTodoItem(int id, TodoItemDto todoItemDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        // Convert to markdown link if the todo is a valid https link
        if(UrlUtilities.IsValidUrl(todoItemDto?.Title)){
            var websiteTitle =  await UrlUtilities.GetWebsiteTileAsync(todoItemDto.Title!);
            if(!string.IsNullOrWhiteSpace(websiteTitle)){
                todoItemDto.Title = $"[{websiteTitle}]({todoItemDto.Title})";
            }
        }

        var todoItemEntity = await dbContext.TodoItems.FirstOrDefaultAsync(r => r.Id == id && r.UserId == AuthenticatedUserEmail);
        if (todoItemEntity == null)
        {
            return NotFound();
        }

        todoItemEntity.Update(todoItemDto.Title, todoItemDto.Description, todoItemDto.ItemOrder, todoItemDto.TodoTopicId);
        if (todoItemEntity.HasError())
        {
            return BadRequest(todoItemEntity.Errors().First());
        }

        await dbContext.SaveChangesAsync();

        return todoItemEntity;
    }

    [HttpPost("{id}/done")]
    public async Task<ActionResult> MarkItemAsDone(int id)
    {
        var todoItemEntity = await dbContext.TodoItems.FirstOrDefaultAsync(r => r.Id == id && r.UserId == AuthenticatedUserEmail);
        if (todoItemEntity == null)
        {
            return NotFound();
        }

        todoItemEntity.MarkAsDone();

        if (todoItemEntity.HasError())
        {
            return BadRequest(todoItemEntity.Errors().First());
        }

        await dbContext.SaveChangesAsync();

        return Ok();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TodoItem>> Get(int id)
    {
        var todoItem = await dbContext.TodoItems.FirstOrDefaultAsync(r => r.UserId == AuthenticatedUserEmail && r.Id == id);

        if (todoItem is null)
        {
            return NotFound();
        }

        return todoItem;
    }

    [HttpGet()]
    public async Task<ActionResult<List<TodoItem>>> GetAll()
    {
        var todoItems = await dbContext.TodoItems.Where(r => r.UserId == AuthenticatedUserEmail && r.Status != TodoItemStatus.Done).ToListAsync();

        if (todoItems is null)
        {
            return NotFound();
        }

        return todoItems;
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var todoItem = await dbContext.TodoItems.FirstOrDefaultAsync(r => r.UserId == AuthenticatedUserEmail && r.Id == id);

        if (todoItem is null)
        {
            return NotFound();
        }

        dbContext.TodoItems.Remove(todoItem);
        await dbContext.SaveChangesAsync();
        return Ok();
    }
}
