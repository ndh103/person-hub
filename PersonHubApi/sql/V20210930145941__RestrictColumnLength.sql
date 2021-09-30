START TRANSACTION;

ALTER TABLE "TodoItems" ALTER COLUMN "UserId" TYPE character varying(100);

ALTER TABLE "TodoItems" ALTER COLUMN "Title" TYPE character varying(250);

ALTER TABLE "TodoItems" ALTER COLUMN "Description" TYPE character varying(1000);

ALTER TABLE "Events" ALTER COLUMN "UserId" TYPE character varying(100);

ALTER TABLE "Events" ALTER COLUMN "Title" TYPE character varying(250);

ALTER TABLE "Events" ALTER COLUMN "Description" TYPE character varying(1000);

COMMIT;

