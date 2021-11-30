using PersonHub.Domain.FinisherModule;

namespace PersonHub.Api.Areas.FinisherItems.Models;

public class FinisherItemRequestDto
{
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTime? StartDate { get; set; }

    public FinisherItemStatus Status { get; set; }

    public string[]? Tags { get; set; }
}
