using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PersonHub.Api.Common;
using PersonHub.Domain.Interfaces;
using PersonHub.Domain.TodoModule.Entities;

namespace PersonHub.Api.Areas.Todos.Controllers
{
    [ApiController]
    [Route("todos/[controller]")]
    [Authorize]
    public class ItemsController : ApiControllerBase
    {
        private IAsyncRepository<TodoItem> _repository { get; }

        public ItemsController(IAsyncRepository<TodoItem> repository)
        {
            _repository = repository;
        }

        [HttpPost("")]
        public async Task<ActionResult<TodoItem>> AddTodoItem(TodoItem todoItemModel)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest();
            }

            // Reset the id to prevent Id set from client side
            todoItemModel.UserName = this.AuthenticatedUserEmail;
            var addedItem =  await _repository.AddAsync(todoItemModel);

            return Ok(addedItem);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTodoItem(int id, TodoItem todoItemModel)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest();
            }

            var todoItem = await _repository.GetByIdAsync(id);
            if (todoItem == null)
            {
                return NotFound();
            }

            todoItem.Title = todoItemModel.Title;
            todoItem.Description = todoItemModel.Description;
            todoItem.Status = todoItemModel.Status;
            todoItem.ItemOrder = todoItemModel.ItemOrder;

            await _repository.UpdateAsync(todoItem);

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
            var todoItems = await _repository.ListAsync(r => r.UserName == AuthenticatedUserEmail && r.Status == (TodoItemStatus)status);

            return Ok(todoItems);
        }


        [HttpGet("{id}")]
        public async Task<ActionResult<TodoItem>> Get(int id)
        {
            var todoItem = await _repository.FirstOrDefaultAsync(r =>r.UserName == AuthenticatedUserEmail && r.Id == id);

            if(todoItem is null){
                return BadRequest();
            }
            
            return Ok(todoItem);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var todoItem = await _repository.FirstOrDefaultAsync(r =>r.UserName == AuthenticatedUserEmail && r.Id == id);

            if(todoItem is null){
                return BadRequest();
            }

            await _repository.DeleteAsync(todoItem);
            return Ok();
        }
    }
}