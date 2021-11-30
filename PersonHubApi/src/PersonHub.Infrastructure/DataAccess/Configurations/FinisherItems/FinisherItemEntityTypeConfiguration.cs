using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PersonHub.Domain.FinisherModule;

namespace PersonHub.Infrastructure.DataAccess.Configurations.Events;

public class FinisherItemEntityTypeConfiguration : IEntityTypeConfiguration<FinisherItem>
{
    public void Configure(EntityTypeBuilder<FinisherItem> builder)
    {
        builder.UsePropertyAccessMode(PropertyAccessMode.Field);

        builder.Property(r => r.Id).UseIdentityAlwaysColumn();
        builder.Property(r => r.UserId).IsRequired().HasMaxLength(100);
        builder.Property(r => r.Title).IsRequired().HasMaxLength(250);
        builder.Property(r => r.Description).HasMaxLength(1000);

        builder.Property(r => r.StartDate).HasColumnType("timestamptz");
        builder.Property(r => r.FinishDate).HasColumnType("timestamptz");

        builder.HasMany<FinisherItemLog>(r => r.Logs).WithOne().HasForeignKey(r => r.FinisherItemId).OnDelete(DeleteBehavior.Cascade);

        builder.Property<string[]>("_tags").HasColumnName("Tags");

    }
}