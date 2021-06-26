using PersonHub.Core.Models;
using Microsoft.EntityFrameworkCore;

namespace PersonHub.Infrastructure.DataAccess
{
    public class PersonHubDbContext : DbContext
    {
        public DbSet<Challenge> Challenges { get; set; }

        public PersonHubDbContext(DbContextOptions<PersonHubDbContext> options)
            : base(options)
        {

        }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);
        }
    }
}