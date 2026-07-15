-- AlterTable
ALTER TABLE "Process" ADD COLUMN "recommendedTrainingHours" DECIMAL(6,2);

-- AlterTable
ALTER TABLE "TraineeProcess" ADD COLUMN "recommendedTrainingHours" DECIMAL(6,2);

-- CreateTable
CREATE TABLE "TrainingHoursEntry" (
    "id" SERIAL NOT NULL,
    "traineeProcessId" INTEGER NOT NULL,
    "trainingDate" TIMESTAMP(3) NOT NULL,
    "hours" DECIMAL(5,2) NOT NULL,
    "enteredBy" TEXT,
    "lastEditedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingHoursEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrainingHoursEntry_traineeProcessId_trainingDate_key" ON "TrainingHoursEntry"("traineeProcessId", "trainingDate");

-- CreateIndex
CREATE INDEX "TrainingHoursEntry_trainingDate_idx" ON "TrainingHoursEntry"("trainingDate");

-- CreateIndex
CREATE INDEX "TrainingHoursEntry_traineeProcessId_trainingDate_idx" ON "TrainingHoursEntry"("traineeProcessId", "trainingDate");

-- AddForeignKey
ALTER TABLE "TrainingHoursEntry" ADD CONSTRAINT "TrainingHoursEntry_traineeProcessId_fkey" FOREIGN KEY ("traineeProcessId") REFERENCES "TraineeProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;
