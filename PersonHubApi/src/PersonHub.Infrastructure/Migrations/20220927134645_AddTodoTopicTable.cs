using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PersonHub.Infrastructure.Migrations
{
    public partial class AddTodoTopicTable : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Type",
                table: "TodoItems");

            migrationBuilder.AddColumn<long>(
                name: "TodoTopicId",
                table: "TodoItems",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "TodoTopics",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    Name = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "timestamptz", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TodoTopics", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TodoItems_TodoTopicId",
                table: "TodoItems",
                column: "TodoTopicId");

            migrationBuilder.CreateIndex(
                name: "IX_TodoTopics_Name",
                table: "TodoTopics",
                column: "Name",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_TodoItems_TodoTopics_TodoTopicId",
                table: "TodoItems",
                column: "TodoTopicId",
                principalTable: "TodoTopics",
                principalColumn: "Id");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TodoItems_TodoTopics_TodoTopicId",
                table: "TodoItems");

            migrationBuilder.DropTable(
                name: "TodoTopics");

            migrationBuilder.DropIndex(
                name: "IX_TodoItems_TodoTopicId",
                table: "TodoItems");

            migrationBuilder.DropColumn(
                name: "TodoTopicId",
                table: "TodoItems");

            migrationBuilder.AddColumn<int>(
                name: "Type",
                table: "TodoItems",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }
    }
}
