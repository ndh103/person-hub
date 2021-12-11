using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text.Json.Serialization;
using PersonHub.Domain.Entities;
using PersonHub.Domain.Interfaces;

namespace PersonHub.Domain.FinisherModule;

public class FinisherItem : BaseEntity, IAggregateRoot
{
    [JsonInclude]
    public string UserId { get; private set; }

    [JsonInclude]
    public string Title { get; private set; }

    [JsonInclude]
    public string? Description { get; private set; }

    [JsonInclude]
    public DateTime? StartDate { get; private set; }

    [JsonInclude]
    public DateTime? FinishDate { get; private set; }

    [JsonInclude]
    public FinisherItemStatus Status { get; private set; }

    private string[] _tags = new string[] { };

    [JsonInclude]
    [NotMapped]
    public IReadOnlyCollection<string> Tags
    {
        get
        {
            return _tags.ToList().AsReadOnly();
        }
        private set
        {
            _tags = value.ToArray();
        }
    }

    private List<FinisherItemLog> _logs = new List<FinisherItemLog>();

    [JsonInclude]
    public IReadOnlyCollection<FinisherItemLog> Logs
    {
        get
        {
            return _logs.AsReadOnly();
        }
        private set
        {
            _logs = value.ToList();
        }
    }

    /// <summary>
    /// This is just to overcome the Deserialize issue, when your real constructor does not have matching Property
    /// This parameterless constructor should not be used in code
    /// </summary>
    public FinisherItem() { }

    public FinisherItem(string userId, string title, string description, DateTime? startDate, string[] tags, FinisherItemStatus status)
    {
        UserId = userId;
        Title = title;
        Description = description;
        StartDate = startDate.HasValue ? startDate.Value.ToUniversalTime() : null;

        if (tags != null)
        {
            _tags = (string[])tags.Clone();
        }

        Status = status;

        CheckValidState();
    }

    public void Update(string title, string description, DateTime? startDate, string[] tags)
    {
        Title = title;
        Description = description;
        StartDate = startDate.HasValue ? startDate.Value.ToUniversalTime() : null;
        if (tags != null)
        {
            this._tags = (string[])tags.Clone();
        }

        CheckValidState();
    }

    public void Start(DateTime startDate)
    {
        if (Status == FinisherItemStatus.Started)
        {
            this._entityState.AddError("The item is already started");
        }

        if (Status == FinisherItemStatus.Finished)
        {
            this._entityState.AddError("The item is already finished");
        }

        this.StartDate = startDate.ToUniversalTime();
        this.Status = FinisherItemStatus.Started;
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

        this.FinishDate = finishDate.ToUniversalTime();
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

    private void CheckValidState()
    {
        if (string.IsNullOrEmpty(this.Title))
        {
            this._entityState.AddError("Item Title is required");
        }

        if (this.Title.Length > 250)
        {
            _entityState.AddError("Item Title should not exceed 250 characters");
        }

        if (!string.IsNullOrEmpty(this.Description) && this.Description.Length > 1000)
        {
            _entityState.AddError("Item Description should not exceed 1000 characters");
        }

        if (this._tags != null)
        {
            if (this._tags.Length > 10)
            {
                _entityState.AddError("Maximum Tags is 10");
            }

            if (this._tags.Any(tag => tag.Length > 50))
            {
                _entityState.AddError("A tag should not exceed 50 characters");
            }
        }

        if (!Enum.IsDefined(typeof(FinisherItemStatus), Status))
        {
            _entityState.AddError("Item Status is invalid");
        }

        if (Status == FinisherItemStatus.Planning && StartDate.HasValue)
        {
            _entityState.AddError("A Planning item should not have a start date");
        }

        if (Status != FinisherItemStatus.Planning && !StartDate.HasValue)
        {
            _entityState.AddError("And already started Item should have a StartDate");
        }

        if (Status != FinisherItemStatus.Finished && FinishDate.HasValue)
        {
            _entityState.AddError("A not yet finished item should not have a finish date");
        }

        if (Status == FinisherItemStatus.Finished && !FinishDate.HasValue)
        {
            _entityState.AddError("A finished item should have a FinishDate");
        }
    }
}
