using System;

namespace PersonHub.IntegrationTest.DataAccess.FinisherItems;

public class FinisherItemLogEntity
{
    public long Id { get; set; }

    public long FinisherItemId { get; set; }

    public string Content { get; set; }

    public DateTime CreatedDate { get; set; }
}
