-- CreateTable
CREATE TABLE "RefresherCompletion" (
    "id" SERIAL NOT NULL,
    "traineeProcessId" INTEGER NOT NULL,
    "department" TEXT NOT NULL,
    "traineeName" TEXT NOT NULL,
    "process" TEXT NOT NULL,
    "completedDate" TIMESTAMP(3) NOT NULL,
    "outcome" TEXT,
    "assessor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefresherCompletion_pkey" PRIMARY KEY ("id")
);

-- Preserve every completion date that is still available on the current refresher records.
INSERT INTO "RefresherCompletion" (
    "traineeProcessId",
    "department",
    "traineeName",
    "process",
    "completedDate",
    "outcome",
    "assessor",
    "createdAt"
)
SELECT
    "traineeProcessId",
    "department",
    "traineeName",
    "process",
    "completedDate",
    "outcome",
    "assignedAssessor",
    CURRENT_TIMESTAMP
FROM "RefresherRecord"
WHERE "completedDate" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "RefresherCompletion_traineeProcessId_completedDate_key"
ON "RefresherCompletion"("traineeProcessId", "completedDate");

-- CreateIndex
CREATE INDEX "RefresherCompletion_completedDate_idx"
ON "RefresherCompletion"("completedDate");

-- CreateIndex
CREATE INDEX "RefresherCompletion_department_completedDate_idx"
ON "RefresherCompletion"("department", "completedDate");

-- AddForeignKey
ALTER TABLE "RefresherCompletion"
ADD CONSTRAINT "RefresherCompletion_traineeProcessId_fkey"
FOREIGN KEY ("traineeProcessId") REFERENCES "TraineeProcess"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
