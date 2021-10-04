using System;
using PersonHub.Domain.Entities;
using PersonHub.Domain.Interfaces;

namespace PersonHub.Domain.TodoModule.Entities
{
    public class TodoItem : BaseEntity, IAggregateRoot
    {
        public string UserId {get;set;}

        public string  Title { get; set; }

        public string Description { get; set; }

        public TodoItemStatus Status { get; set; }

        public string ItemOrder {get;set;}

        public TodoItem(string userId, string title, string description, TodoItemStatus status, string itemOrder){
            this.UserId= userId;
            this.Title = title;
            this.Description = description;
            this.Status = status;
            this.ItemOrder = itemOrder;

            EnsureValidState();
        }

        public TodoItem(){
            
        }

        public void EnsureValidState(){
            if(string.IsNullOrWhiteSpace(UserId)){
                throw new ArgumentException("TodoItem UserId is required");
            }

            if(string.IsNullOrWhiteSpace(Title)){
                throw new ArgumentException("TodoItem Title is required");
            }

            if(!Enum.IsDefined(typeof(TodoItemStatus), Status)){
                throw new ArgumentException("TodoItem status is invalid");
            }

            if(string.IsNullOrEmpty(ItemOrder)){
                throw new ArgumentException("TodoItem ItemOrder is required");
            }
        }
    }
}