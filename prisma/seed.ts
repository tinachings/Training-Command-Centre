import 'dotenv/config';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.setting.deleteMany();
  await prisma.followUpAction.deleteMany();
  await prisma.refresherRecord.deleteMany();
  await prisma.assessmentRecord.deleteMany();
  await prisma.weeklyPlannerItem.deleteMany();
  await prisma.traineeProcess.deleteMany();
  await prisma.process.deleteMany();
  await prisma.trainee.deleteMany();
  await prisma.department.deleteMany();

  const surfacing = await prisma.department.create({ data: { name: 'Surfacing' } });
  const coating = await prisma.department.create({ data: { name: 'Coating' } });

  const surfacingProcesses = [
    'Lens Inspection', 'Rejects/Reworks', 'Auto Blocking', 'Manual Blocking', 'A&R Machines', 'Button Collection', 'Dispatch',
  ];
  const coatingProcesses = ['Loading', 'Unloading', 'Tinting', 'Tray Allocation', 'ARX', 'Stripping', 'Final Inspection'];

  for (const name of surfacingProcesses) {
    await prisma.process.create({ data: { name, departmentId: surfacing.id } });
  }
  for (const name of coatingProcesses) {
    await prisma.process.create({ data: { name, departmentId: coating.id } });
  }

  const trainees = [
    { name: 'Daniel', departmentId: surfacing.id, teamLeader: 'M. Patel', trainingAssessor: 'J. Evans', shift: 'Days', startDate: new Date('2026-01-10') },
    { name: 'Feyi', departmentId: surfacing.id, teamLeader: 'M. Patel', trainingAssessor: 'J. Evans', shift: 'Nights', startDate: new Date('2026-02-02') },
    { name: 'Louie', departmentId: coating.id, teamLeader: 'S. Morris', trainingAssessor: 'A. Green', shift: 'Days', startDate: new Date('2026-01-18') },
    { name: 'Grzegorz', departmentId: coating.id, teamLeader: 'S. Morris', trainingAssessor: 'A. Green', shift: 'Nights', startDate: new Date('2026-02-10') },
  ];

  for (const trainee of trainees) {
    const created = await prisma.trainee.create({ data: trainee });
    const process = await prisma.process.findFirst({ where: { departmentId: trainee.departmentId } });
    if (process) {
      await prisma.traineeProcess.create({
        data: {
          traineeId: created.id,
          processId: process.id,
          department: trainee.departmentId === surfacing.id ? 'Surfacing' : 'Coating',
          stage: 'In Training',
          nextAction: 'Continue coaching and log check-in',
          followUpFlag: 'CHASE',
          buddyFeedbackScore: 4,
          assessorObservationScore: 4,
          timeSpentInShifts: 6,
          readinessScore: 85,
          trainingBuddy: 'T. Reed',
          trainingStartDate: new Date('2026-02-01'),
          lastCheckInDate: new Date('2026-06-01'),
        },
      });
    }
  }

  await prisma.setting.createMany({
    data: [
      { key: 'setupOverdueAfterDays', value: '2' },
      { key: 'chaseAfterDays', value: '5' },
      { key: 'priorityAfterReadyDays', value: '5' },
      { key: 'readinessTargetShifts', value: '5' },
      { key: 'refresherDueSoonWindow', value: '30' },
    ],
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
