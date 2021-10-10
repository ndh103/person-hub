using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PersonHub.Domain.EventsModule.Entities;
using PersonHub.Domain.FinisherModule;

namespace PersonHub.Infrastructure.DataAccess.Configurations.Events
{
    public class FinisherItemLogEntityTypeConfiguration : IEntityTypeConfiguration<FinisherItemLog>
    {
        public void Configure(EntityTypeBuilder<FinisherItemLog> builder)
        {
            builder.Property(r=> r.Id).UseIdentityAlwaysColumn();
            builder.Property(r =>r.CreatedDate).IsRequired();
            builder.Property(r=>r.Content).IsRequired();
        }
    }
}