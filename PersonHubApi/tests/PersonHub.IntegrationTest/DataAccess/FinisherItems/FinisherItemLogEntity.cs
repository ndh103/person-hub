using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PersonHub.Domain.FinisherModule;

namespace PersonHub.IntegrationTest.DataAccess.FinisherItems
{
    public class FinisherItemLogEntity
    {
        public long Id { get; set; }

        public long FinisherItemId { get; set; }

        public string Content { get; set; }

        public DateTime CreatedDate { get; set; }
    }
}