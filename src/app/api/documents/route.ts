import { NextResponse } from 'next/server';
import { ensureDocumentTables } from '@/lib/document-storage';
import { documentTypes, priorities, requestTypes } from '@/lib/document-workflow';
import { prisma } from '@/lib/prisma';

function cleanDate(value: unknown) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const date = new Date(`${text}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET() {
  await ensureDocumentTables();

  const documents = await prisma.documentRecord.findMany({
    include: {
      events: {
        orderBy: { date: 'desc' },
      },
    },
    orderBy: [{ stage: 'asc' }, { dateRequested: 'desc' }],
  });

  return NextResponse.json(documents);
}

export async function POST(request: Request) {
  await ensureDocumentTables();

  const body = await request.json();
  const title = String(body.title ?? '').trim();
  const documentType = String(body.documentType ?? '').trim();
  const documentNumber = String(body.documentNumber ?? '').trim();
  const process = String(body.process ?? '').trim();
  const requestType = String(body.requestType ?? '').trim();
  const requester = String(body.requester ?? '').trim();
  const dateRequested = cleanDate(body.dateRequested);
  const requestDetails = String(body.requestDetails ?? '').trim();
  const priority = String(body.priority ?? 'Normal').trim();
  const targetCompletionDate = cleanDate(body.targetCompletionDate);
  const currentRevision = String(body.currentRevision ?? '').trim();
  const changeDetails = String(body.changeDetails ?? '').trim();

  if (
    !title ||
    !process ||
    !requester ||
    !dateRequested ||
    !requestDetails ||
    !documentTypes.includes(documentType as never) ||
    !requestTypes.includes(requestType as never) ||
    !priorities.includes(priority as never)
  ) {
    return NextResponse.json(
      { error: 'Complete all required document request fields.' },
      { status: 400 },
    );
  }

  const created = await prisma.documentRecord.create({
    data: {
      title,
      documentType,
      documentNumber: documentNumber || null,
      process,
      requestType,
      requester,
      dateRequested,
      requestDetails,
      priority,
      targetCompletionDate,
      currentRevision: currentRevision || null,
      changeDetails: changeDetails || null,
      events: {
        create: {
          eventType: 'Request received',
          toStage: 'Request Received',
          note: requestDetails,
          date: dateRequested,
        },
      },
    },
    include: {
      events: {
        orderBy: { date: 'desc' },
      },
    },
  });

  return NextResponse.json(created, { status: 201 });
}
