import { NextResponse } from 'next/server';
import { ensureDocumentTables } from '@/lib/document-storage';
import { isValidStage } from '@/lib/document-workflow';
import { prisma } from '@/lib/prisma';

const asDate = (value: unknown) => {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const date = new Date(`${text}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  await ensureDocumentTables();
  const { id } = await context.params;
  const documentId = Number(id);
  const existing = await prisma.documentRecord.findUnique({ where: { id: documentId } });

  if (!existing) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });

  const body = await request.json();
  const stage = body.stage === undefined ? existing.stage : String(body.stage).trim();
  const note = String(body.note ?? '').trim();

  if (!isValidStage(existing.requestType, stage)) {
    return NextResponse.json({ error: 'Invalid workflow stage.' }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.documentRecord.update({
      where: { id: documentId },
      data: {
        stage,
        liveDate: stage === 'Live' ? (asDate(body.liveDate) ?? existing.liveDate ?? new Date()) : existing.liveDate,
        trialStartDate: body.trialStartDate === undefined ? existing.trialStartDate : asDate(body.trialStartDate),
        trialEndDate: body.trialEndDate === undefined ? existing.trialEndDate : asDate(body.trialEndDate),
        targetCompletionDate: body.targetCompletionDate === undefined ? existing.targetCompletionDate : asDate(body.targetCompletionDate),
        documentNumber: body.documentNumber === undefined ? existing.documentNumber : (String(body.documentNumber ?? '').trim() || null),
        currentRevision: body.currentRevision === undefined ? existing.currentRevision : (String(body.currentRevision ?? '').trim() || null),
        changeDetails: body.changeDetails === undefined ? existing.changeDetails : (String(body.changeDetails ?? '').trim() || null),
      },
    });

    if (stage !== existing.stage || note) {
      await tx.documentStageEvent.create({
        data: {
          documentId,
          eventType: stage === 'Revision Required' ? 'Revision required' : stage !== existing.stage ? 'Stage changed' : 'Note added',
          fromStage: existing.stage,
          toStage: stage,
          note: note || null,
        },
      });
    }

    return tx.documentRecord.findUnique({
      where: { id: documentId },
      include: { events: { orderBy: { date: 'desc' } } },
    });
  });

  return NextResponse.json(updated);
}
