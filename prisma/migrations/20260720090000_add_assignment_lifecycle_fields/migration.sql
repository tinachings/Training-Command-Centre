ALTER TABLE "TraineeProcess"
ADD COLUMN "assignmentStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "removedAt" TIMESTAMP(3),
ADD COLUMN "removalNote" TEXT,
ADD COLUMN "removedBy" TEXT;

CREATE INDEX "TraineeProcess_assignmentStatus_idx" ON "TraineeProcess"("assignmentStatus");
