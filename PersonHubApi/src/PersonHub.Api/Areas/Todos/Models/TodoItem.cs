using System;

namespace PersonHub.Api.Areas.Todos.Models
{
    public class TodoItem
    {
        public Int64 Id { get; set; }

        public string UserName {get;set;}

        public string  Title { get; set; }

        public string Description { get; set; }

        public TodoItemStatus Status { get; set; }

        public string ItemOrder {get;set;}
        
    }
}