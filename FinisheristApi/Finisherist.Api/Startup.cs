using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.OpenApi.Models;
using Finisherist.Api.Common.DependencyInjections.ServiceExtensions;
using Finisherist.IdentityProvider;

namespace Finisherist.Api
{
    public class Startup
    {
        public Startup(IWebHostEnvironment environment, IConfiguration configuration)
        {
            Configuration = configuration;
            Environment = environment;
        }

        public IConfiguration Configuration { get; }

        public IWebHostEnvironment Environment { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddApplicationOptions(Configuration);

            services.AddCors(options =>
            {
                options.AddPolicy(name: "AllowAll",
                                builder =>
                                {
                                    builder.AllowAnyHeader();
                                    builder.AllowAnyMethod();
                                    builder.AllowAnyOrigin();
                                });
            });

            services.AddControllersWithViews();

            services.AddIdentityAuthentication();

            services.AddApplicationDbContexts(Configuration);

            services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo { Title = "Finisherist.Api", Version = "v1" });
            });
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app)
        {
            if (Environment.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
                app.UseSwagger();
                app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Finisherist.Api v1"));
            }

            app.UseStaticFiles();

            app.UseRouting();

            app.UseCors("AllowAll");

            app.UseIdentityServer();

            app.UseAuthorization();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapDefaultControllerRoute();
            });
        }
    }
}
