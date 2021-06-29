using Microsoft.EntityFrameworkCore;
using PersonHub.Api.Areas.Todos.Models;

namespace PersonHub.Api.Infrastructure.DataAccess
{
    public class PersonHubDbContext : DbContext
    {
        public DbSet<TodoItem> TodoItems { get; set; }

        public PersonHubDbContext(DbContextOptions<PersonHubDbContext> options) : base(options)
        {

        }
    }
}