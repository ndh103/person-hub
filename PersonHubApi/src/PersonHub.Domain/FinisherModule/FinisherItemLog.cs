using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PersonHub.Domain.Entities;
using PersonHub.Domain.Shared;

namespace PersonHub.Domain.FinisherModule
{
    public class FinisherItemLog : BaseEntity
    {
        public long FinisherItemId { get; set; }

        public string Content { get; set; }

        public DateTime CreatedDate { get; set; }

        public FinisherItemLog(long finisherItemId, string content)
        {
            this.FinisherItemId = finisherItemId;
            this.Content = content;
            this.CreatedDate = DateTime.Now;
        }

        public EntityState CheckValidState()
        {
            var result = new EntityState();

            if (string.IsNullOrEmpty(this.Content))
            {
                result.AddError("Content is required");
            }

            return result;
        }
    }
}