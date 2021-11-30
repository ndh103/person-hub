using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using PersonHub.Domain.Shared;

namespace PersonHub.Domain.Entities;

// This can easily be modified to be BaseEntity<T> and public T Id to support different key types.
// Using non-generic integer types for simplicity and to ease caching logic
public abstract class BaseEntity
{
    [JsonInclude]
    public virtual long Id { get; protected set; }

    public bool HasError() => _entityState.HasError;

    public IReadOnlyCollection<string> Errors() => _entityState.Errors;

    [NotMapped]
    protected EntityState _entityState = new EntityState();
}
