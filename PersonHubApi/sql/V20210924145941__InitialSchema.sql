START TRANSACTION;

CREATE TABLE "Events" (
    "Id" bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    "Title" text NOT NULL,
    "Description" text NULL,
    "EventDate" timestamp without time zone NOT NULL,
    "Tags" text[] NULL,
    CONSTRAINT "PK_Events" PRIMARY KEY ("Id")
);

CREATE TABLE "TodoItems" (
    "Id" bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    "UserName" text NULL,
    "Title" text NULL,
    "Description" text NULL,
    "Status" integer NOT NULL,
    "ItemOrder" text NULL,
    CONSTRAINT "PK_TodoItems" PRIMARY KEY ("Id")
);

COMMIT;

