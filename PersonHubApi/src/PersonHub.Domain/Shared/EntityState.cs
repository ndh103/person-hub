using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace PersonHub.Domain.Shared
{
    public class EntityState
    {
        public bool HasError { get; set; } = false;

        private List<string> _errors = new List<string>();

        public IReadOnlyCollection<string> Errors => _errors.AsReadOnly();

        public void AddError(string error)
        {
            this.HasError = true;
            this._errors.Add(error);
        }
    }
}