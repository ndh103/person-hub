using Microsoft.EntityFrameworkCore;
using PersonHub.Domain.TodoModule.Entities;

namespace PersonHub.Infrastructure.DataAccess
{
    public class PersonHubDbContext : DbContext
    {
        public DbSet<TodoItem> TodoItems { get; set; }

        public PersonHubDbContext(DbContextOptions<PersonHubDbContext> options) : base(options)
        {

        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.HasSequence<int>("TodoItemId", schema:"shared");

            modelBuilder.Entity<TodoItem>()
                .Property(e => e.Id)
                .HasDefaultValueSql("NEXT VALUE FOR shared.TodoItemId");
        }
    }
}