CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;

CREATE TABLE "Events" (
    "Id" bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    "UserId" text NOT NULL,
    "Title" text NOT NULL,
    "Description" text NULL,
    "EventDate" timestamp without time zone NOT NULL,
    "Tags" text[] NULL,
    CONSTRAINT "PK_Events" PRIMARY KEY ("Id")
);

CREATE TABLE "TodoItems" (
    "Id" bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    "UserId" text NOT NULL,
    "Title" text NOT NULL,
    "Description" text NULL,
    "Status" integer NOT NULL,
    "ItemOrder" text NOT NULL,
    CONSTRAINT "PK_TodoItems" PRIMARY KEY ("Id")
);

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20210927133026_InitialSchema', '5.0.5');

COMMIT;

