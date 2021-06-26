using System.ComponentModel.DataAnnotations;
using PersonHub.Core.Common.Enum;

namespace PersonHub.Core.Models
{
    public class Challenge
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string UserId { get; set; }

        public string Title { get; set; }

        public string Description { get; set; }

        public ChallengeStatus Status { get; set; }
    }
}