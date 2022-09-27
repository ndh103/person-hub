# run this bash script FROM THE ROOT FOLDER to create EF Core Migration
# Paramerter: name of migration
dotnet ef migrations add $1 --project src/PersonHub.Infrastructure/PersonHub.Infrastructure.csproj --startup-project src/PersonHub.Api/PersonHub.Api.csproj