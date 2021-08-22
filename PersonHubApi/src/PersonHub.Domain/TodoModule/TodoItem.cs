using System;
using PersonHub.Domain.Entities;
using PersonHub.Domain.Interfaces;

namespace PersonHub.Domain.TodoModule.Entities
{
    public class TodoItem : BaseEntity, IAggregateRoot
    {
        public string UserName {get;set;}

        public string  Title { get; set; }

        public string Description { get; set; }

        public TodoItemStatus Status { get; set; }

        public string ItemOrder {get;set;}
    }
}