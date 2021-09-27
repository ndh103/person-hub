# run this bash script FROM THE ROOT FOLDER to create migration sql script
# parameter: the Migration FROM which to create the sql migration (normally the last Migration name)
dotnet ef migrations script --project src/PersonHub.Infrastructure/PersonHub.Infrastructure.csproj --startup-project src/PersonHub.Api/PersonHub.Api.csproj -o New.sql $1
