using System;
using System.Text.Json.Serialization;
using PersonHub.Domain.Entities;

namespace PersonHub.Domain.FinisherModule;

public class FinisherItemLog : BaseEntity
{
    [JsonInclude]
    public long FinisherItemId { get; set; }

    [JsonInclude]
    public string Content { get; private set; }

    [JsonInclude]
    public DateTime CreatedDate { get; private set; }
    
    public FinisherItemLog(long finisherItemId, string content)
    {
        this.FinisherItemId = finisherItemId;
        this.Content = content;
        this.CreatedDate = DateTime.UtcNow;
    }

    public void Update(string content)
    {
        this.Content = content;

        CheckValidState();
    }

    private void CheckValidState()
    {
        if (string.IsNullOrEmpty(this.Content))
        {
            _entityState.AddError("Content is required");
        }
    }
}
