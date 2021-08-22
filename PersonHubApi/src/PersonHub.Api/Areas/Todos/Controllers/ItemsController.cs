using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonHub.Api.Areas.Todos.Models;
using PersonHub.Api.Common;
using PersonHub.Api.Infrastructure.DataAccess;

namespace PersonHub.Api.Areas.Todos.Controllers
{
    [ApiController]
    [Route("todos/[controller]")]
    [Authorize]
    public class ItemsController : ApiControllerBase
    {
        private PersonHubDbContext _dbContext;
        public ItemsController(PersonHubDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        [HttpPost("")]
        public async Task<ActionResult<TodoItem>> AddTodoItem(TodoItem todoItemModel)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest();
            }

            // Reset the id to prevent Id set from client side
            todoItemModel.Id = 0;
            todoItemModel.UserName = this.AuthenticatedUserEmail;

            _dbContext.TodoItems.Add(todoItemModel);
            await _dbContext.SaveChangesAsync();

            return Ok(todoItemModel);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTodoItem(int id, TodoItem todoItemModel)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest();
            }

            var todoItem = _dbContext.TodoItems.FirstOrDefault(r => r.Id == id);
            if (todoItem == null)
            {
                return NotFound();
            }

            todoItem.Title = todoItemModel.Title;
            todoItem.Description = todoItemModel.Description;
            todoItem.Status = todoItemModel.Status;
            todoItem.ItemOrder = todoItemModel.ItemOrder;

            await _dbContext.SaveChangesAsync();

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

            var todoItems = await _dbContext.TodoItems.Where(r => r.UserName == AuthenticatedUserEmail && r.Status == (TodoItemStatus)status).ToListAsync();

            return Ok(todoItems);
        }


        [HttpGet("{id}")]
        public async Task<ActionResult<TodoItem>> Get(int id)
        {
            var todoItem = await _dbContext.TodoItems.FirstOrDefaultAsync(r =>r.UserName == AuthenticatedUserEmail && r.Id == id);

            if(todoItem is null){
                return BadRequest();
            }
            
            return Ok(todoItem);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var todoItem = await _dbContext.TodoItems.FirstOrDefaultAsync(r =>r.UserName == AuthenticatedUserEmail && r.Id == id);

            if(todoItem is null){
                return BadRequest();
            }
            
            _dbContext.Remove(todoItem);
            await _dbContext.SaveChangesAsync();

            return Ok();
        }
    }
}