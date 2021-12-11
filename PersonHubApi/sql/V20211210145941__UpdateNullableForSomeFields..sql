ALTER TABLE "FinisherItems" ALTER COLUMN "Tags" SET NOT NULL;
ALTER TABLE "FinisherItems" ALTER COLUMN "Tags" SET DEFAULT ARRAY[]::text[];

ALTER TABLE "FinisherItemLog" ALTER COLUMN "CreatedDate" TYPE timestamp with time zone;

ALTER TABLE "FinisherItemLog" ALTER COLUMN "Content" SET NOT NULL;
ALTER TABLE "FinisherItemLog" ALTER COLUMN "Content" SET DEFAULT '';

ALTER TABLE "Events" ALTER COLUMN "Tags" SET NOT NULL;
ALTER TABLE "Events" ALTER COLUMN "Tags" SET DEFAULT ARRAY[]::text[];
