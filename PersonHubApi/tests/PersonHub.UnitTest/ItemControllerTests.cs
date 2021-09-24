using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NSubstitute;
using PersonHub.Api.Areas.Todos.Controllers;
using PersonHub.Domain.Interfaces;
using PersonHub.Domain.TodoModule.Entities;
using PersonHub.Infrastructure.DataAccess;
using Xunit;

namespace PersonHub.UnitTest
{
    public class UnitTest1
    {
        [Fact]
        public async Task ItemsController_AddTodoItemWithValidRequest_ShouldSuccessAsync()
        {
            var repository = Substitute.For<IAsyncRepository<TodoItem>>();
            repository.AddAsync(Arg.Any<TodoItem>()).Returns(new TodoItem(){});

            var controller = new ItemsController(repository);

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
