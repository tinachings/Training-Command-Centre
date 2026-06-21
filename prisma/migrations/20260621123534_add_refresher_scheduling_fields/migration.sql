-- AlterTable
ALTER TABLE "RefresherRecord" ADD COLUMN     "scheduleStatus" TEXT,
ADD COLUMN     "scheduledRefresherDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "RefresherRecord_scheduledRefresherDate_idx" ON "RefresherRecord"("scheduledRefresherDate");
