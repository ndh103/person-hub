using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PersonHub.Domain.TodoModule.Entities;

namespace PersonHub.Infrastructure.DataAccess.Configurations.TodoItems
{
    public class TodoItemEntityTypeConfiguration : IEntityTypeConfiguration<TodoItem>
    {
        public void Configure(Microsoft.EntityFrameworkCore.Metadata.Builders.EntityTypeBuilder<TodoItem> builder)
        {
            builder.Property(r=>r.Id).UseIdentityAlwaysColumn();
        }
    }
}