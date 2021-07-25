START TRANSACTION;

ALTER TABLE "TodoItems" ADD "ItemOrder" text NULL;

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20210722142322_AddTodoItemOrderField', '5.0.5');

COMMIT;

