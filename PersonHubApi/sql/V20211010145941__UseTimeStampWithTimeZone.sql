START TRANSACTION;

ALTER TABLE "FinisherItems" ALTER COLUMN "StartDate" TYPE timestamptz;

ALTER TABLE "FinisherItems" ALTER COLUMN "FinishDate" TYPE timestamptz;

ALTER TABLE "Events" ALTER COLUMN "EventDate" TYPE timestamptz;

COMMIT;

