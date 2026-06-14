-- AlterTable
ALTER TABLE "TraineeProcess"
ADD COLUMN "requestedBy" TEXT,
ADD COLUMN "riskAssessmentComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "sopComplete" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" SERIAL NOT NULL,
    "traineeId" INTEGER NOT NULL,
    "traineeProcessId" INTEGER,
    "process" TEXT,
    "eventType" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessCheckIn" (
    "id" SERIAL NOT NULL,
    "traineeId" INTEGER NOT NULL,
    "traineeProcessId" INTEGER NOT NULL,
    "checkInDate" TIMESTAMP(3) NOT NULL,
    "assessor" TEXT NOT NULL,
    "progressSummary" TEXT NOT NULL,
    "issuesIdentified" TEXT,
    "supportRequired" TEXT,
    "nextAction" TEXT,
    "reviewDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessCheckIn_pkey" PRIMARY KEY ("id")
);

-- ReplaceIndex
DROP INDEX "Process_departmentId_name_idx";
CREATE UNIQUE INDEX "Process_departmentId_name_key" ON "Process"("departmentId", "name");

-- CreateIndex
CREATE INDEX "TimelineEvent_traineeId_date_idx" ON "TimelineEvent"("traineeId", "date");

-- CreateIndex
CREATE INDEX "TimelineEvent_traineeProcessId_date_idx" ON "TimelineEvent"("traineeProcessId", "date");

-- CreateIndex
CREATE INDEX "ProcessCheckIn_traineeId_checkInDate_idx" ON "ProcessCheckIn"("traineeId", "checkInDate");

-- CreateIndex
CREATE INDEX "ProcessCheckIn_traineeProcessId_checkInDate_idx" ON "ProcessCheckIn"("traineeProcessId", "checkInDate");

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_traineeProcessId_fkey" FOREIGN KEY ("traineeProcessId") REFERENCES "TraineeProcess"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessCheckIn" ADD CONSTRAINT "ProcessCheckIn_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessCheckIn" ADD CONSTRAINT "ProcessCheckIn_traineeProcessId_fkey" FOREIGN KEY ("traineeProcessId") REFERENCES "TraineeProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
