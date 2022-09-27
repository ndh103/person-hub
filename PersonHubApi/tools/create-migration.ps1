# run this bash script FROM THE ROOT FOLDER to create EF Core Migration
# Paramerter: name of migration
$migrationName=$args[1]
dotnet ef migrations add $migrationName --project src/PersonHub.Infrastructure/PersonHub.Infrastructure.csproj --startup-project src/PersonHub.Api/PersonHub.Api.csproj