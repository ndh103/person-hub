using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace PersonHub.Api.Areas.Todos.Models
{
    public class TodoTopicDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;

        public string Order { get; set; } = string.Empty;
    }
}