using Microsoft.EntityFrameworkCore.Migrations;

namespace PersonHub.Api.Infrastructure.Migrations
{
    public partial class AddTodoItemOrderField : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ItemOrder",
                table: "TodoItems",
                type: "text",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ItemOrder",
                table: "TodoItems");
        }
    }
}
