using System.ComponentModel.DataAnnotations;
using PersonHub.Domain.TodoModule.Entities;

namespace PersonHub.Api.Areas.Todos.Models
{
    public class TodoItemDto
    {
        public string Title { get; set; }

        public string Description { get; set; }

        public TodoItemStatus Status { get; set; }

        public TodoItemType Type { get; set; }

        public string ItemOrder { get; set; }
    }
}