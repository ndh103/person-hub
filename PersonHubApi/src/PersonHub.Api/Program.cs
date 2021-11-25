using Microsoft.OpenApi.Models;
using PersonHub.Api.Common.Configs;
using PersonHub.Api.Common.DependencyInjections;
using PersonHub.Api.Common.Middlewares;
using PersonHub.Domain.Interfaces;
using PersonHub.Infrastructure.DataAccess;
using Serilog;
using Serilog.Events;
using Serilog.Sinks.SystemConsole.Themes;

Log.Logger = new LoggerConfiguration()
                .MinimumLevel.Debug()
                .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
                .MinimumLevel.Override("Microsoft.Hosting.Lifetime", LogEventLevel.Information)
                .MinimumLevel.Override("System", LogEventLevel.Warning)
                .MinimumLevel.Override("Microsoft.AspNetCore.Authentication", LogEventLevel.Information)
                .Enrich.FromLogContext()
                .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level}] {SourceContext}{NewLine}{Message:lj}{NewLine}{Exception}{NewLine}", theme: AnsiConsoleTheme.Code)
                .CreateLogger();

var builder = WebApplication.CreateBuilder(args);

builder.Logging.AddSerilog();

builder.Services.AddCors(config =>
            {
                config.AddPolicy("AllowSpecified", options => options.WithOrigins("http://localhost:8080", "https://person-hub.herokuapp.com", "https://personhub.z23.web.core.windows.net")
                    .AllowAnyMethod()
                    .AllowAnyHeader());
            });

builder.Services.AddScoped(typeof(IAsyncRepository<>), typeof(EfRepository<>));

builder.Services.Configure<DatabaseConnectionConfig>(builder.Configuration.GetSection(nameof(DatabaseConnectionConfig)));

builder.Services.AddControllersWithViews();
builder.Services.AddAppAuthentication(builder.Configuration);

builder.Services.AddApplicationDbContexts(builder.Configuration);

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "PersonHub.Api", Version = "v1" });
    //TODO: add authentication for swagger
});


var app = builder.Build();

app.UseMiddleware<AppExceptionHandlerMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "PersonHub.Api V1");
        // options.OAuthClientId("swagger-client");
        // options.OAuthClientSecret("swagger-secret".Sha256());
        // options.OAuthAppName("Demo API - Swagger");
        // options.OAuthUsePkce();
    });
}

app.UseStaticFiles();

app.UseRouting();

app.UseCors("AllowSpecified");

app.UseAuthentication();

app.UseAuthorization();

app.UseEndpoints(endpoints =>
{
    endpoints.MapDefaultControllerRoute();
});

app.Run();


// Make the implicit Program class public so test projects can access it
public partial class Program { }
