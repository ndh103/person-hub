﻿ALTER TABLE "TodoItems" ADD "CreatedDate" timestamptz NOT NULL DEFAULT TIMESTAMPTZ '0001-01-01 00:00:00 UTC';

ALTER TABLE "TodoItems" ADD "Type" integer NOT NULL DEFAULT 0;

