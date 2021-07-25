using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PersonHub.Api.Common;

namespace PersonHub.Api.Areas.LifeEvents.Controllers
{
    [ApiController]
    [Authorize]
    [Route("lifeEvents/[controller]")]
    public class EventsController : ApiControllerBase
    {
        
        
    }
}