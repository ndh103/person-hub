using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PersonHub.Domain.FinisherModule;

namespace PersonHub.Infrastructure.DataAccess.Configurations.Events;

public class FinisherItemLogEntityTypeConfiguration : IEntityTypeConfiguration<FinisherItemLog>
{
    public void Configure(EntityTypeBuilder<FinisherItemLog> builder)
    {
        builder.Property(r => r.Id).UseIdentityAlwaysColumn();
        builder.Property(r => r.CreatedDate).IsRequired().HasColumnType("timestamptz");
        builder.Property(r => r.Content).IsRequired();
    }
}