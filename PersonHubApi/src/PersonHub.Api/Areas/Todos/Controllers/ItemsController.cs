using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PersonHub.Api.Areas.Todos.Models;
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
        public async Task<ActionResult<TodoItem>> AddTodoItem(TodoItemDto todoItemDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var todoItemEntity = new TodoItem(AuthenticatedUserEmail, todoItemDto.Title, todoItemDto.Description, todoItemDto.Status, todoItemDto.ItemOrder);
            var addedItem =  await _repository.AddAsync(todoItemEntity);

            return addedItem;
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTodoItem(int id, TodoItemDto todoItemDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var todoItemEntity = await _repository.GetByIdAsync(id);
            if (todoItemEntity == null)
            {
                return NotFound();
            }

            todoItemEntity.Title = todoItemDto.Title;
            todoItemEntity.Description = todoItemDto.Description;
            todoItemEntity.Status = todoItemDto.Status;
            todoItemEntity.ItemOrder = todoItemDto.ItemOrder;

            todoItemEntity.EnsureValidState();

            await _repository.UpdateAsync(todoItemEntity);

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
            var todoItems = await _repository.ListAsync(r => r.UserId == AuthenticatedUserEmail && r.Status == (TodoItemStatus)status);

            return todoItems.ToList();
        }


        [HttpGet("{id}")]
        public async Task<ActionResult<TodoItem>> Get(int id)
        {
            var todoItem = await _repository.FirstOrDefaultAsync(r =>r.UserId == AuthenticatedUserEmail && r.Id == id);

            if(todoItem is null){
                return NotFound();
            }

            return todoItem;
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var todoItem = await _repository.FirstOrDefaultAsync(r =>r.UserId == AuthenticatedUserEmail && r.Id == id);

            if(todoItem is null){
                return NotFound();
            }

            await _repository.DeleteAsync(todoItem);
            return Ok();
        }
    }
}