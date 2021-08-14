using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PersonHub.Api.Common;

namespace PersonHub.Api.Areas.LifeEvents.Controllers
{
    [ApiController]
    [Route("life-events/[controller]")]
    public class EventsController : ApiControllerBase
    {
        
        [HttpGet("test")]
        public ActionResult<IEnumerable<string>> Test()
        {
            var items = new List<string>(){
                "test1",
                "test2"
            };

            return Ok(items);
        }
    }
}