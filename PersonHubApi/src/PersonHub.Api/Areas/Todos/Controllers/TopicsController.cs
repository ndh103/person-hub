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
public class TopicsController : ApiControllerBase
{
    private readonly PersonHubDbContext dbContext;

    public TopicsController(PersonHubDbContext dbContext)
    {
        this.dbContext = dbContext;
    }

    [HttpPost("")]
    public async Task<ActionResult<TodoTopic>> AddTodoTopic(TodoTopicDto requestTodoTopic)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var todoTopic = new TodoTopic()
        {
            UserId = AuthenticatedUserEmail,
            Name = requestTodoTopic.Name,
            Order = requestTodoTopic.Order,
            CreatedDate = DateTime.UtcNow
        };

        await dbContext.AddAsync(todoTopic);
        await dbContext.SaveChangesAsync();

        return todoTopic;
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> UpdateTodoTopic(int id, TodoTopicDto todoTopicDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var todoTopicEntity = await dbContext.TodoTopics.FirstOrDefaultAsync(r => r.Id == id && r.UserId == AuthenticatedUserEmail);
        if (todoTopicEntity == null)
        {
            return NotFound();
        }

        todoTopicEntity.Name = todoTopicDto.Name;
        todoTopicEntity.Order = todoTopicDto.Order;

        //TODO: validate the model here using Fluent Validation

        await dbContext.SaveChangesAsync();

        return Ok();
    }

    [HttpGet("")]
    public async Task<ActionResult<List<TodoTopic>>> GetAll()
    {
        var topics = await dbContext.TodoTopics.Where(r => r.UserId == AuthenticatedUserEmail).ToListAsync();

        if (topics is null)
        {
            return NotFound();
        }

        return topics;
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var topic = await dbContext.TodoTopics.FirstOrDefaultAsync(r => r.UserId == AuthenticatedUserEmail && r.Id == id);

        if (topic is null)
        {
            return NotFound();
        }

        dbContext.TodoTopics.Remove(topic);
        await dbContext.SaveChangesAsync();
        return Ok();
    }
}
