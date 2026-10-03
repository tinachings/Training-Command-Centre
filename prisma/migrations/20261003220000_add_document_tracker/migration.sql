-- CreateTable
CREATE TABLE "DocumentRecord" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentNumber" TEXT,
    "process" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "requester" TEXT NOT NULL,
    "dateRequested" TIMESTAMP(3) NOT NULL,
    "requestDetails" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'Request Received',
    "priority" TEXT NOT NULL DEFAULT 'Normal',
    "targetCompletionDate" TIMESTAMP(3),
    "currentRevision" TEXT,
    "trialStartDate" TIMESTAMP(3),
    "trialEndDate" TIMESTAMP(3),
    "liveDate" TIMESTAMP(3),
    "changeDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentStageEvent" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "fromStage" TEXT,
    "toStage" TEXT,
    "note" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentStageEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DocumentRecord_stage_idx" ON "DocumentRecord"("stage");
CREATE INDEX "DocumentRecord_requestType_idx" ON "DocumentRecord"("requestType");
CREATE INDEX "DocumentRecord_dateRequested_idx" ON "DocumentRecord"("dateRequested");
CREATE INDEX "DocumentRecord_targetCompletionDate_idx" ON "DocumentRecord"("targetCompletionDate");
CREATE INDEX "DocumentRecord_liveDate_idx" ON "DocumentRecord"("liveDate");
CREATE INDEX "DocumentStageEvent_documentId_date_idx" ON "DocumentStageEvent"("documentId", "date");

ALTER TABLE "DocumentStageEvent"
ADD CONSTRAINT "DocumentStageEvent_documentId_fkey"
FOREIGN KEY ("documentId") REFERENCES "DocumentRecord"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
