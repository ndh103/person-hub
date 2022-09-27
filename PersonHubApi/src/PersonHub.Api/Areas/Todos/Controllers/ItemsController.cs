using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonHub.Api.Areas.Todos.Models;
using PersonHub.Api.Common;
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

        var todoItemEntity = new TodoItem(AuthenticatedUserEmail, todoItemDto.Title, todoItemDto.Description, todoItemDto.Status, todoItemDto.ItemOrder, todoItemDto.TopicId);
        if (todoItemEntity.HasError())
        {
            return BadRequest(todoItemEntity.Errors().First());
        }

        await dbContext.AddAsync(todoItemEntity);
        await dbContext.SaveChangesAsync();

        return todoItemEntity;
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> UpdateTodoItem(int id, TodoItemDto todoItemDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var todoItemEntity = await dbContext.TodoItems.FirstOrDefaultAsync(r => r.Id == id && r.UserId == AuthenticatedUserEmail);
        if (todoItemEntity == null)
        {
            return NotFound();
        }

        todoItemEntity.Update(todoItemDto.Title, todoItemDto.Description, todoItemDto.ItemOrder);
        if (todoItemEntity.HasError())
        {
            return BadRequest(todoItemEntity.Errors().First());
        }

        await dbContext.SaveChangesAsync();

        return Ok();
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
