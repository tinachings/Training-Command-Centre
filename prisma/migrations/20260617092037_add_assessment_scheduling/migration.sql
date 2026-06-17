-- AlterTable
ALTER TABLE "TraineeProcess" ADD COLUMN     "assignedAssessor" TEXT,
ADD COLUMN     "scheduledAssessmentDate" TIMESTAMP(3),
ADD COLUMN     "scheduledPreAssessmentDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "TraineeProcess_scheduledPreAssessmentDate_idx" ON "TraineeProcess"("scheduledPreAssessmentDate");

-- CreateIndex
CREATE INDEX "TraineeProcess_scheduledAssessmentDate_idx" ON "TraineeProcess"("scheduledAssessmentDate");
