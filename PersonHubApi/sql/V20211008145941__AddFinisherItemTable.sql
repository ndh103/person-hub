﻿START TRANSACTION;

CREATE TABLE "FinisherItems" (
    "Id" bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    "UserId" character varying(100) NOT NULL,
    "Title" character varying(250) NOT NULL,
    "Description" character varying(1000) NULL,
    "StartDate" timestamp without time zone NULL,
    "FinishDate" timestamp without time zone NULL,
    "Status" integer NOT NULL,
    "Tags" text[] NULL,
    CONSTRAINT "PK_FinisherItems" PRIMARY KEY ("Id")
);

CREATE TABLE "FinisherItemLog" (
    "Id" bigint NOT NULL GENERATED BY DEFAULT AS IDENTITY,
    "FinisherItemId" bigint NOT NULL,
    "Content" text NULL,
    "CreatedDate" timestamp without time zone NOT NULL,
    CONSTRAINT "PK_FinisherItemLog" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_FinisherItemLog_FinisherItems_FinisherItemId" FOREIGN KEY ("FinisherItemId") REFERENCES "FinisherItems" ("Id") ON DELETE CASCADE
);

CREATE INDEX "IX_FinisherItemLog_FinisherItemId" ON "FinisherItemLog" ("FinisherItemId");

COMMIT;

