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
    public string UserId { get; set; }
    public string Title { get; set; }

    public string Description { get; set; }

    public DateTime EventDate { get; set; }

    public string[] Tags { get; set; }

    public Event(string userId, string title, string description, DateTime eventDate, string[] tags)
    {
      UserId = userId;
      Title = title;
      Description = description;
      EventDate = eventDate;
      if (tags != null)
      {
        Tags = (string[])tags.Clone();
      }

      EnsureValidState();
    }

    public void EnsureValidState()
    {
      if (string.IsNullOrEmpty(this.Title))
      {
        throw new ArgumentNullException("Event Title is required");
      }

      if (this.Title.Length > 250)
      {
        throw new ArgumentNullException("Event Title should not exceed 250 characters");
      }

      if (!string.IsNullOrEmpty(this.Description) && this.Description.Length > 1000)
      {
        throw new ArgumentException("Event Description should not exceed 1000 characters");
      }

      if(this.Tags != null){
        if(this.Tags.Length > 10){
          throw new ArgumentException("Maximum Event Tags is 10");
        }

        if(this.Tags.Any(tag => tag.Length > 50)){
          throw new ArgumentException("A tag should not exceed 50 characters");
        }
      }
    }
  }
}