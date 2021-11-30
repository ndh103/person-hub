namespace PersonHub.Api.Areas.Events.Models;

public class EventRequestDto
{
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTime? EventDate { get; set; }

    public string[]? Tags { get; set; }
}
