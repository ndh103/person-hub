using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace PersonHub.Api.Areas.Events.Models
{
    public class EventRequestDto
    {
        public string Title { get; set; }

        public string Description { get; set; }

        public DateTime? EventDate { get; set; }

        public string[] Tags { get; set; }
    }
}