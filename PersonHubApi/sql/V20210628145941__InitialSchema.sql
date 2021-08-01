CREATE TABLE "TodoItems" (
    "Id" bigint NOT NULL GENERATED BY DEFAULT AS IDENTITY,
    "UserName" text NULL,
    "Title" text NULL,
    "Description" text NULL,
    "Status" integer NOT NULL,
    CONSTRAINT "PK_TodoItems" PRIMARY KEY ("Id")
);