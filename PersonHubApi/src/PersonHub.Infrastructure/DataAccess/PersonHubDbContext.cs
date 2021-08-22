using Microsoft.EntityFrameworkCore;
using PersonHub.Domain.Entities;

namespace PersonHub.Infrastructure.DataAccess
{
    public class PersonHubDbContext : DbContext
    {
        public DbSet<TodoItem> TodoItems { get; set; }

        public PersonHubDbContext(DbContextOptions<PersonHubDbContext> options) : base(options)
        {

        }
    }
}