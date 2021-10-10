using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PersonHub.Domain.EventsModule.Entities;

namespace PersonHub.Infrastructure.DataAccess.Configurations.Events
{
    public class EventEntityTypeConfiguration : IEntityTypeConfiguration<Event>
    {
        public void Configure(EntityTypeBuilder<Event> builder)
        {
            builder.Property(r=> r.Id).UseIdentityAlwaysColumn();
            builder.Property(r=> r.UserId).IsRequired().HasMaxLength(100);
            builder.Property(r=>r.EventDate).IsRequired().HasColumnType("timestamptz");
            builder.Property(r=>r.Title).IsRequired().HasMaxLength(250);
            builder.Property(r=>r.Description).HasMaxLength(1000);
        }
    }
}