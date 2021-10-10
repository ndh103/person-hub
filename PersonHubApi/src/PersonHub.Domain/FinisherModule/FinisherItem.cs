using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PersonHub.Domain.Entities;
using PersonHub.Domain.FinisherModule;
using PersonHub.Domain.Interfaces;
using PersonHub.Domain.Shared;

namespace PersonHub.Domain.FinisherModule
{
    public class FinisherItem : BaseEntity, IAggregateRoot
    {
        public string UserId { get; set; }

        public string Title { get; set; }

        public string Description { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? FinishDate { get; set; }

        public FinisherItemStatus Status { get; set; }

        public string[] Tags { get; set; }

        public List<FinisherItemLog> Logs { get; set; } = new List<FinisherItemLog>();

        public FinisherItem(string userId, string title, string description, DateTime? startDate, string[] tags, FinisherItemStatus status)
        {
            UserId = userId;
            Title = title;
            Description = description;
            StartDate = startDate;
            if (tags != null)
            {
                Tags = (string[])tags.Clone();
            }

            Status = status;
        }

        public EntityState CheckValidState()
        {
            var result = new EntityState();

            if (string.IsNullOrEmpty(this.Title))
            {
                result.AddError("Item Title is required");
            }

            if (this.Title.Length > 250)
            {
                result.AddError("Item Title should not exceed 250 characters");
            }

            if (!string.IsNullOrEmpty(this.Description) && this.Description.Length > 1000)
            {
                result.AddError("Item Description should not exceed 1000 characters");
            }

            if (this.Tags != null)
            {
                if (this.Tags.Length > 10)
                {
                    result.AddError("Maximum Tags is 10");
                }

                if (this.Tags.Any(tag => tag.Length > 50))
                {
                    result.AddError("A tag should not exceed 50 characters");
                }
            }

            if (!Enum.IsDefined(typeof(FinisherItemStatus), Status))
            {
                result.AddError("Item Status is invalid");
            }

            return result;
        }
    }
}