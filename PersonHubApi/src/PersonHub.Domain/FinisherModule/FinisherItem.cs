using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using PersonHub.Domain.Entities;
using PersonHub.Domain.FinisherModule;
using PersonHub.Domain.Interfaces;
using PersonHub.Domain.Shared;

namespace PersonHub.Domain.FinisherModule
{
    public class FinisherItem : BaseEntity, IAggregateRoot
    {
        [JsonInclude]
        public string UserId { get; private set; }

        [JsonInclude]
        public string Title { get; private set; }

        [JsonInclude]
        public string Description { get; private set; }

        [JsonInclude]
        public DateTime? StartDate { get; private set; }

        [JsonInclude]
        public DateTime? FinishDate { get; private set; }

        [JsonInclude]
        public FinisherItemStatus Status { get; private set; }

        private string[] _tags = new string[] { };

        [JsonInclude]
        public IReadOnlyCollection<string> Tags => _tags.ToList().AsReadOnly();

        private readonly List<FinisherItemLog> _logs = new List<FinisherItemLog>();

        [JsonInclude]
        public IReadOnlyCollection<FinisherItemLog> Logs => _logs.AsReadOnly();

        private FinisherItem() { }

        public FinisherItem(string userId, string title, string description, DateTime? startDate, string[] tags, FinisherItemStatus status)
        {
            UserId = userId;
            Title = title;
            Description = description;
            StartDate = startDate;
            if (tags != null)
            {
                _tags = (string[])tags.Clone();
            }

            Status = status;

            CheckValidState();
        }

        public void Update(string title, string description, DateTime? startDate, string[] tags, FinisherItemStatus status)
        {
            Title = title;
            Description = description;
            StartDate = startDate;
            if (tags != null)
            {
                this._tags = (string[])tags.Clone();
            }

            Status = status;

            CheckValidState();
        }

        public void Finish(DateTime finishDate)
        {
            if (Status == FinisherItemStatus.Finished)
            {
                this._entityState.AddError("The item is already finished");
            }

            if (FinishDate < StartDate)
            {
                _entityState.AddError("Finish Date should be later or equal to Start Date");
            }

            this.FinishDate = finishDate;
            this.Status = FinisherItemStatus.Finished;
        }

        public void AddLog(FinisherItemLog log)
        {
            this._logs.Add(log);
        }

        public void RemoveLog(int logId)
        {
            var log = this._logs.FirstOrDefault(r => r.Id == logId);
            if (log == null)
            {
                this._entityState.AddError("Log item not found");
                return;
            }

            this._logs.Remove(log);
        }

        private EntityState CheckValidState()
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

            if (this._tags != null)
            {
                if (this._tags.Length > 10)
                {
                    result.AddError("Maximum Tags is 10");
                }

                if (this._tags.Any(tag => tag.Length > 50))
                {
                    result.AddError("A tag should not exceed 50 characters");
                }
            }

            if (!Enum.IsDefined(typeof(FinisherItemStatus), Status))
            {
                result.AddError("Item Status is invalid");
            }

            if (Status == FinisherItemStatus.Planning && StartDate.HasValue)
            {
                result.AddError("A Planning item should not have a start date");
            }

            if (Status != FinisherItemStatus.Planning && !StartDate.HasValue)
            {
                result.AddError("And already started Item should have a StartDate");
            }

            if (Status != FinisherItemStatus.Finished && FinishDate.HasValue)
            {
                result.AddError("A not yet finished item should not have a finish date");
            }

            if (Status == FinisherItemStatus.Finished && !FinishDate.HasValue)
            {
                result.AddError("A finished item should have a FinishDate");
            }

            return result;
        }
    }
}