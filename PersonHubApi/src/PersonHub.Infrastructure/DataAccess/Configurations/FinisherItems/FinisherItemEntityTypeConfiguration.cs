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
    public class FinisherItemEntityTypeConfiguration : IEntityTypeConfiguration<FinisherItem>
    {
        public void Configure(EntityTypeBuilder<FinisherItem> builder)
        {
            builder.Property(r=> r.Id).UseIdentityAlwaysColumn();
            builder.Property(r=> r.UserId).IsRequired().HasMaxLength(100);
            builder.Property(r=>r.Title).IsRequired().HasMaxLength(250);
            builder.Property(r=>r.Description).HasMaxLength(1000);

            builder.HasMany<FinisherItemLog>(r => r.Logs).WithOne().HasForeignKey(r =>r.FinisherItemId).OnDelete(DeleteBehavior.Cascade);
        }
    }
}