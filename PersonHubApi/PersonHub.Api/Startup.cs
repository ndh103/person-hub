using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.OpenApi.Models;
using PersonHub.IdentityProvider;
using PersonHub.Api.Common.DependencyInjections;
using System;
using System.Collections.Generic;
using IdentityServer4;
using PersonHub.Api.Common.Filters;
using IdentityServer4.Models;

namespace PersonHub.Api
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

            services.AddLocalApiAuthentication();

            services.AddApplicationDbContexts(Configuration);

            services.AddSwaggerGen(options =>
            {
                options.SwaggerDoc("v1", new OpenApiInfo { Title = "PersonHub.Api", Version = "v1" });

                // Add Authentication Definition for Swagger
                options.AddSecurityDefinition("oauth2", new OpenApiSecurityScheme
                {
                    Type = SecuritySchemeType.OAuth2,
                    Flows = new OpenApiOAuthFlows
                    {
                        AuthorizationCode = new OpenApiOAuthFlow
                        {
                            AuthorizationUrl = new Uri("https://localhost:5001/connect/authorize"),
                            TokenUrl = new Uri("https://localhost:5001/connect/token"),
                            Scopes = new Dictionary<string, string>
                            {
                                {"openid", "OpenId Scope"},
                                {"profile", "profile scope"},
                                {"email", "email scope"},
                                {IdentityServerConstants.LocalApi.ScopeName, "IdentityServerApi scope"},
                            }
                        }
                    }
                });

                // Apply filter on the Actions that have Authorize need
                options.OperationFilter<SwaggerAuthorizeCheckOperationFilter>();

            });
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app)
        {
            if (Environment.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
                app.UseSwagger();
                app.UseSwaggerUI(options =>
                {
                    options.SwaggerEndpoint("/swagger/v1/swagger.json", "PersonHub.Api V1");
                    options.OAuthClientId("swagger-client");
                    options.OAuthClientSecret("swagger-secret".Sha256());
                    options.OAuthAppName("Demo API - Swagger");
                    options.OAuthUsePkce();
                });
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
