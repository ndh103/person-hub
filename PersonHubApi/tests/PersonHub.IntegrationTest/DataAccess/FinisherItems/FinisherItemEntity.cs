using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PersonHub.Domain.FinisherModule;

namespace PersonHub.IntegrationTest.DataAccess.FinisherItems
{
    public class FinisherItemEntity
    {
        public long Id { get; set; }

        public string UserId { get; set; }

        public string Title { get; set; }

        public string Description { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? FinishDate { get; set; }

        public FinisherItemStatus Status { get; set; }

        public string[] Tags = new string[] { };
    }
}