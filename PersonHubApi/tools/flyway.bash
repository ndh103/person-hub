# flyway migration
# run this bash script FROM THE ROOT FOLDER 
# flyway migrate -url=jdbc:postgresql://localhost:5432/person-hub-db -schemas="person-hub" -user=postgres -password=P@ssw0rd -locations=filesystem:sql

docker-compose -f ./tools/docker-compose.flyway.yml up -d
docker-compose -f ./tools/docker-compose.flyway.yml down


