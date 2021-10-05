using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonHub.Api.Areas.Todos.Models;
using PersonHub.Api.Common;
using PersonHub.Domain.Interfaces;
using PersonHub.Domain.TodoModule.Entities;
using PersonHub.Infrastructure.DataAccess;

namespace PersonHub.Api.Areas.Todos.Controllers
{
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

            var todoItemEntity = new TodoItem(AuthenticatedUserEmail, todoItemDto.Title, todoItemDto.Description, todoItemDto.Status, todoItemDto.ItemOrder);

            await dbContext.AddAsync(todoItemEntity);
            await dbContext.SaveChangesAsync();
            
            return todoItemEntity;
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTodoItem(int id, TodoItemDto todoItemDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var todoItemEntity = await dbContext.TodoItems.FirstOrDefaultAsync(r =>r.Id == id && r.UserId == AuthenticatedUserEmail);
            if (todoItemEntity == null)
            {
                return NotFound();
            }

            todoItemEntity.Title = todoItemDto.Title;
            todoItemEntity.Description = todoItemDto.Description;
            todoItemEntity.Status = todoItemDto.Status;
            todoItemEntity.ItemOrder = todoItemDto.ItemOrder;

            todoItemEntity.EnsureValidState();

            await dbContext.SaveChangesAsync();

            return Ok();
        }

        [HttpGet("status/{status}")]
        public async Task<ActionResult<IEnumerable<TodoItem>>> QueryByStatus(int status)
        {
            var isValidStatus = Enum.IsDefined(typeof(TodoItemStatus), status);
            if (!isValidStatus)
            {
                return BadRequest();
            }
            var todoItems = await dbContext.TodoItems.Where(r => r.UserId == AuthenticatedUserEmail && r.Status == (TodoItemStatus)status).ToListAsync();

            return todoItems;
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
}