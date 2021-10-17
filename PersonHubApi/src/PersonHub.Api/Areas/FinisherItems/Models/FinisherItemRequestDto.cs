using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PersonHub.Domain.FinisherModule;

namespace PersonHub.Api.Areas.FinisherItems.Models
{
    public class FinisherItemRequestDto
    {
        public string Title { get; set; }

        public string Description { get; set; }

        public DateTime? StartDate { get; set; }

        public FinisherItemStatus Status { get; set; }

        public string[] Tags { get; set; }
    }
}