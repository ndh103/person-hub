using Microsoft.EntityFrameworkCore;
using PersonHub.Domain.EventsModule.Entities;
using PersonHub.Domain.TodoModule.Entities;
using PersonHub.Infrastructure.DataAccess.Configurations.Events;
using PersonHub.Infrastructure.DataAccess.Configurations.TodoItems;

namespace PersonHub.Infrastructure.DataAccess
{
    public class PersonHubDbContext : DbContext
    {
        public DbSet<TodoItem> TodoItems { get; set; }

        public DbSet<Event> Events { get; set; }

        public PersonHubDbContext(DbContextOptions<PersonHubDbContext> options) : base(options)
        {

        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            new TodoItemEntityTypeConfiguration().Configure(modelBuilder.Entity<TodoItem>());

            new EventEntityTypeConfiguration().Configure(modelBuilder.Entity<Event>());
        }
    }
}