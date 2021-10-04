using System.ComponentModel.DataAnnotations;
using PersonHub.Domain.TodoModule.Entities;

namespace PersonHub.Api.Areas.Todos.Models
{
    public class TodoItemDto
    {
        [Required(ErrorMessage ="TodoItem Title is required")]
        [MaxLength(250, ErrorMessage ="TodoItem Title exceeds the max length of 250 characters")]
        public string  Title { get; set; }

        [MaxLength(1000, ErrorMessage ="TodoItem Description exceeds the max length of 1000 characters")]
        public string Description { get; set; }

        [Required(ErrorMessage ="TodoItem Status is required")]
        public TodoItemStatus Status { get; set; }

        [Required(ErrorMessage ="TodoItem ItemOrder is required")]
        public string ItemOrder {get;set;}
    }
}