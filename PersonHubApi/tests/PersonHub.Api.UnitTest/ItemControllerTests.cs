using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NSubstitute;
using PersonHub.Api.Areas.Todos.Controllers;
using PersonHub.Domain.Entities;
using PersonHub.Infrastructure.DataAccess;
using Xunit;

namespace PersonHub.Api.UnitTest
{
    public class UnitTest1
    {
        [Fact]
        public async Task ItemsController_AddTodoItemWithValidRequest_ShouldSuccessAsync()
        {
            
            var options = new DbContextOptionsBuilder<PersonHubDbContext>()
            .UseInMemoryDatabase(databaseName: "person-hub-db-test")
            .Options;

            using var dbContext = new PersonHubDbContext(options);

            var controller = new ItemsController(dbContext);

            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.Name, "example name"),
                new Claim("https://custom-claim/email", "testuser@gmail.com")
            }, authenticationType: "Test"));
            
            controller.ControllerContext = new ControllerContext()
            {
                HttpContext = new DefaultHttpContext() { User = user }
            };

            var result = await controller.AddTodoItem(new TodoItem());

            var okResult = result.Result as OkObjectResult;

            Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);
        }
    }
}
