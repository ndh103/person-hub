using System.Threading.Tasks;
using System.Linq;
using System.Collections.Generic;

namespace PersonHub.Domain.EventsModule.Queries;

public interface IGetTopTagsQuery
{
    Task<IEnumerable<string>> QueryAsync(string userId, int limit);
}
