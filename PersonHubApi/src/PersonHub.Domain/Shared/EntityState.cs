using System.Collections.Generic;

namespace PersonHub.Domain.Shared;

public class EntityState
{
    public bool HasError { get; private set; } = false;

    private List<string> _errors = new List<string>();

    public IReadOnlyCollection<string> Errors => _errors.AsReadOnly();

    public void AddError(string error)
    {
        this.HasError = true;
        this._errors.Add(error);
    }
}