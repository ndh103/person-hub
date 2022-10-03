using Microsoft.EntityFrameworkCore;
using PersonHub.Domain.TodoModule.Entities;

namespace PersonHub.Infrastructure.DataAccess.Configurations.TodoItems;

public class TodoTopicEntityConfiguration : IEntityTypeConfiguration<TodoTopic>
{
    public void Configure(Microsoft.EntityFrameworkCore.Metadata.Builders.EntityTypeBuilder<TodoTopic> builder)
    {
        builder.Property(r => r.Id).UseIdentityAlwaysColumn();
        builder.Property(r => r.Name).IsRequired().HasMaxLength(250);
        builder.HasIndex(r=> r.Name).IsUnique();
        builder.Property(r => r.CreatedDate).HasColumnType("timestamptz");
    }
}