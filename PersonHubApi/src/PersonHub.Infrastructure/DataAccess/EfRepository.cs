using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PersonHub.Domain.Entities;
using PersonHub.Domain.Interfaces;

namespace PersonHub.Infrastructure.DataAccess
{
    /// <summary>
    /// "There's some repetition here - couldn't we have some the sync methods call the async?"
    /// https://blogs.msdn.microsoft.com/pfxteam/2012/04/13/should-i-expose-synchronous-wrappers-for-asynchronous-methods/
    /// </summary>
    /// <typeparam name="T"></typeparam>
    public class EfRepository<T> : IAsyncRepository<T> where T : BaseEntity, IAggregateRoot
    {
        protected readonly PersonHubDbContext _dbContext;

        public EfRepository(PersonHubDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public virtual async Task<T> GetByIdAsync(long id, CancellationToken cancellationToken = default)
        {
            var keyValues = new object[] { id };
            return await _dbContext.Set<T>().FindAsync(keyValues, cancellationToken);
        }

        public async Task<IReadOnlyList<T>> ListAllAsync(CancellationToken cancellationToken = default)
        {
            return await _dbContext.Set<T>().ToListAsync(cancellationToken);
        }

        public async Task<T> AddAsync(T entity, CancellationToken cancellationToken = default)
        {
            await _dbContext.Set<T>().AddAsync(entity);
            await _dbContext.SaveChangesAsync(cancellationToken);

            return entity;
        }

        public async Task UpdateAsync(T entity, CancellationToken cancellationToken = default)
        {
            _dbContext.Entry(entity).State = EntityState.Modified;
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        public async Task DeleteAsync(T entity, CancellationToken cancellationToken = default)
        {
            _dbContext.Set<T>().Remove(entity);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        public async Task<IReadOnlyList<T>> ListAsync(Expression<Func<T, bool>> predicate, CancellationToken cancellationToken = default)
        {
            var result =  await _dbContext.Set<T>().AsQueryable().Where(predicate).ToListAsync();
            return result.AsReadOnly();
        }

        public async Task<int> CountAsync(Expression<Func<T, bool>> predicate, CancellationToken cancellationToken = default)
        {
            return await _dbContext.Set<T>().AsQueryable().Where(predicate).CountAsync();
        }

        public async Task<T> FirstAsync(Expression<Func<T, bool>> predicate, CancellationToken cancellationToken = default)
        {
            return await _dbContext.Set<T>().AsQueryable().FirstAsync(predicate);
        }

        public async Task<T> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate, CancellationToken cancellationToken = default)
        {
            return await _dbContext.Set<T>().AsQueryable().FirstOrDefaultAsync(predicate);
        }

        // public async Task<IReadOnlyList<T>> ListAsync(ISpecification<T> spec, CancellationToken cancellationToken = default)
        // {
        //     var specificationResult = ApplySpecification(spec);
        //     return await specificationResult.ToListAsync(cancellationToken);
        // }

        // public async Task<int> CountAsync(ISpecification<T> spec, CancellationToken cancellationToken = default)
        // {
        //     var specificationResult = ApplySpecification(spec);
        //     return await specificationResult.CountAsync(cancellationToken);
        // }

        // public async Task<T> FirstAsync(ISpecification<T> spec, CancellationToken cancellationToken = default)
        // {
        //     var specificationResult = ApplySpecification(spec);
        //     return await specificationResult.FirstAsync(cancellationToken);
        // }

        // public async Task<T> FirstOrDefaultAsync(ISpecification<T> spec, CancellationToken cancellationToken = default)
        // {
        //     var specificationResult = ApplySpecification(spec);
        //     return await specificationResult.FirstOrDefaultAsync(cancellationToken);
        // }

        // private IQueryable<T> ApplySpecification(ISpecification<T> spec)
        // {
        //     var evaluator = new SpecificationEvaluator<T>();
        //     return evaluator.GetQuery(_dbContext.Set<T>().AsQueryable(), spec);
        // }
    }
}