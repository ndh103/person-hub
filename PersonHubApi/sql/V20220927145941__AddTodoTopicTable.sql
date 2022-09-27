ALTER TABLE "TodoItems" DROP COLUMN "Type";

ALTER TABLE "TodoItems" ADD "TodoTopicId" bigint NULL;

CREATE TABLE "TodoTopics" (
    "Id" bigint GENERATED ALWAYS AS IDENTITY,
    "UserId" text NOT NULL,
    "Name" character varying(250) NOT NULL,
    "Order" text NOT NULL,
    "CreatedDate" timestamptz NOT NULL,
    CONSTRAINT "PK_TodoTopics" PRIMARY KEY ("Id")
);

CREATE INDEX "IX_TodoItems_TodoTopicId" ON "TodoItems" ("TodoTopicId");

CREATE UNIQUE INDEX "IX_TodoTopics_Name" ON "TodoTopics" ("Name");

ALTER TABLE "TodoItems" ADD CONSTRAINT "FK_TodoItems_TodoTopics_TodoTopicId" FOREIGN KEY ("TodoTopicId") REFERENCES "TodoTopics" ("Id");

