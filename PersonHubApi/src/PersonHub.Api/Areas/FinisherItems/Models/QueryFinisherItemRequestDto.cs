using PersonHub.Domain.FinisherModule;

namespace PersonHub.Api.Areas.FinisherItems.Models
{
    public class QueryFinisherItemRequestDto
    {
        public int Limit { get; set; }

        public int Offset { get; set; }

        public FinisherItemStatus Status { get; set; }
    }
}

