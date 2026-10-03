import { prisma } from '@/lib/prisma';

let ready = false;

export async function ensureDocumentTables() {
  if (ready) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "DocumentRecord" (
      "id" SERIAL PRIMARY KEY,
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
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "DocumentStageEvent" (
      "id" SERIAL PRIMARY KEY,
      "documentId" INTEGER NOT NULL,
      "eventType" TEXT NOT NULL,
      "fromStage" TEXT,
      "toStage" TEXT,
      "note" TEXT,
      "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "DocumentStageEvent_documentId_fkey"
        FOREIGN KEY ("documentId") REFERENCES "DocumentRecord"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);

  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "DocumentRecord_stage_idx" ON "DocumentRecord"("stage")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "DocumentRecord_requestType_idx" ON "DocumentRecord"("requestType")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "DocumentRecord_dateRequested_idx" ON "DocumentRecord"("dateRequested")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "DocumentRecord_targetCompletionDate_idx" ON "DocumentRecord"("targetCompletionDate")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "DocumentRecord_liveDate_idx" ON "DocumentRecord"("liveDate")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "DocumentStageEvent_documentId_date_idx" ON "DocumentStageEvent"("documentId", "date")',
  );

  ready = true;
}
