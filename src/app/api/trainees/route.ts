import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const trainees = await prisma.trainee.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(trainees);
}

export async function POST(request: Request) {
  const body = await request.json();

  const department = await prisma.department.upsert({
    where: { name: body.department },
    update: {},
    create: { name: body.department },
  });

  const trainee = await prisma.trainee.create({
    data: {
      name: body.name,
      departmentId: department.id,
      teamLeader: body.teamLeader || null,
      trainingAssessor: body.trainingAssessor || null,
      shift: body.shift || null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      archived: false,
    },
  });

  return NextResponse.json(trainee);
}