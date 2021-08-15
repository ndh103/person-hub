using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using PersonHub.Api.Common;

namespace PersonHub.Api.Areas.LifeEvents.Controllers
{
    [ApiController]
    [Route("life-events/[controller]")]
    public class EventsController : ApiControllerBase
    {
        private readonly IConfiguration _configuration;
        public EventsController(IConfiguration configuration)
        {
            this._configuration = configuration;

        }

        [HttpGet("test")]
        public ActionResult<string> Test()
        {
            var appName = this._configuration["ApplicationSetting:AppName"];

            return Ok(appName);
        }
    }
}