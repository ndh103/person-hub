using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PersonHub.Domain.Entities;
using PersonHub.Domain.Interfaces;

namespace PersonHub.Domain.EventsModule.Entities
{
    public class Event : BaseEntity, IAggregateRoot
    {
        public string Title { get; set; }

        public string Description { get; set; }

        public DateTime EventDate { get; set; }

        public string[] Tags { get; set; }

        public Event(string title, string description, DateTime eventDate, string[] tags)
        {
            if (string.IsNullOrEmpty(title))
            {
                throw new ArgumentNullException("Event Title is required");
            }

            Title = title;
            Description = description;
            EventDate = eventDate;
            if (tags != null)
            {
                Tags = (string[])tags.Clone();
            }
        }

        public void EnsureValidState()
        {
            if (string.IsNullOrEmpty(this.Title))
            {
                throw new ArgumentNullException("Event Title is required");
            }
        }
    }
}