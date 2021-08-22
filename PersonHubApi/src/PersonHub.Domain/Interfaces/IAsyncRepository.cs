using System;
using System.Collections.Generic;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using PersonHub.Domain.Entities;

namespace PersonHub.Domain.Interfaces
{
    public interface IAsyncRepository<T> where T : BaseEntity, IAggregateRoot
    {
        Task<T> GetByIdAsync(long id, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<T>> ListAllAsync(CancellationToken cancellationToken = default);
        
        Task<T> AddAsync(T entity, CancellationToken cancellationToken = default);
        Task UpdateAsync(T entity, CancellationToken cancellationToken = default);
        Task DeleteAsync(T entity, CancellationToken cancellationToken = default);

        //TODO: Add Specification later instead of using Expression directly
        Task<IReadOnlyList<T>> ListAsync(Expression<Func<T, bool>> predicate, CancellationToken cancellationToken = default);
        Task<int> CountAsync(Expression<Func<T, bool>> predicate, CancellationToken cancellationToken = default);
        Task<T> FirstAsync(Expression<Func<T, bool>> predicate, CancellationToken cancellationToken = default);
        Task<T> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate, CancellationToken cancellationToken = default);

        // Task<IReadOnlyList<T>> ListAsync(ISpecification<T> spec, CancellationToken cancellationToken = default);
        // Task<int> CountAsync(ISpecification<T> spec, CancellationToken cancellationToken = default);
        // Task<T> FirstAsync(ISpecification<T> spec, CancellationToken cancellationToken = default);
        // Task<T> FirstOrDefaultAsync(ISpecification<T> spec, CancellationToken cancellationToken = default);
    }
}