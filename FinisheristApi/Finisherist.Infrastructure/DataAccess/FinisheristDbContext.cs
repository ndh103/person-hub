using Finisherist.Core.Models;
using Microsoft.EntityFrameworkCore;

namespace Finisherist.Infrastructure.DataAccess
{
    public class FinisheristDbContext : DbContext
    {
        public DbSet<Challenge> Challenges { get; set; }

        public FinisheristDbContext(DbContextOptions<FinisheristDbContext> options)
            : base(options)
        {

        }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);
        }
    }
}