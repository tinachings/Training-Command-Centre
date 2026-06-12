-- CreateTable
CREATE TABLE "Department" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Process" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Process_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trainee" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "teamLeader" TEXT,
    "trainingAssessor" TEXT,
    "shift" TEXT,
    "startDate" TIMESTAMP(3),
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trainee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingAssessor" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "TrainingAssessor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamLeader" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "TeamLeader_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingBuddy" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "TrainingBuddy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraineeProcess" (
    "id" SERIAL NOT NULL,
    "traineeId" INTEGER NOT NULL,
    "processId" INTEGER NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'Requested',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "department" TEXT NOT NULL,
    "trainingBuddy" TEXT,
    "trainingStartDate" TIMESTAMP(3),
    "lastCheckInDate" TIMESTAMP(3),
    "buddyFeedbackScore" INTEGER,
    "assessorObservationScore" INTEGER,
    "timeSpentInShifts" INTEGER,
    "readinessScore" INTEGER,
    "readyForPreAssessment" BOOLEAN NOT NULL DEFAULT false,
    "preAssessmentDate" TIMESTAMP(3),
    "preAssessmentOutcome" TEXT,
    "assessmentDate" TIMESTAMP(3),
    "assessmentOutcome" TEXT,
    "competencySignOffDate" TIMESTAMP(3),
    "nextAction" TEXT,
    "followUpFlag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TraineeProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyPlannerItem" (
    "id" SERIAL NOT NULL,
    "weekCommencing" TIMESTAMP(3) NOT NULL,
    "plannedDate" TIMESTAMP(3) NOT NULL,
    "department" TEXT NOT NULL,
    "traineeName" TEXT NOT NULL,
    "process" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "owner" TEXT,
    "status" TEXT NOT NULL,
    "actualDate" TIMESTAMP(3),
    "deviationReason" TEXT,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpDate" TIMESTAMP(3),
    "traineeProcessId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyPlannerItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentRecord" (
    "id" SERIAL NOT NULL,
    "traineeProcessId" INTEGER NOT NULL,
    "assessmentType" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "department" TEXT NOT NULL,
    "traineeName" TEXT NOT NULL,
    "process" TEXT NOT NULL,
    "assessor" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "strengths" TEXT,
    "developmentAreas" TEXT,
    "developmentActions" TEXT,
    "finalOutcome" TEXT,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefresherRecord" (
    "id" SERIAL NOT NULL,
    "traineeProcessId" INTEGER NOT NULL,
    "department" TEXT NOT NULL,
    "traineeName" TEXT NOT NULL,
    "process" TEXT NOT NULL,
    "lastCompetencyDate" TIMESTAMP(3),
    "refresherDueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "daysUntilDue" INTEGER,
    "assignedAssessor" TEXT,
    "completedDate" TIMESTAMP(3),
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefresherRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpAction" (
    "id" SERIAL NOT NULL,
    "traineeProcessId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUpAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE INDEX "Process_departmentId_name_idx" ON "Process"("departmentId", "name");

-- CreateIndex
CREATE INDEX "Trainee_departmentId_name_idx" ON "Trainee"("departmentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingAssessor_name_key" ON "TrainingAssessor"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TeamLeader_name_key" ON "TeamLeader"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingBuddy_name_key" ON "TrainingBuddy"("name");

-- CreateIndex
CREATE INDEX "TraineeProcess_stage_idx" ON "TraineeProcess"("stage");

-- CreateIndex
CREATE INDEX "TraineeProcess_assessmentOutcome_idx" ON "TraineeProcess"("assessmentOutcome");

-- CreateIndex
CREATE INDEX "TraineeProcess_department_idx" ON "TraineeProcess"("department");

-- CreateIndex
CREATE INDEX "WeeklyPlannerItem_plannedDate_idx" ON "WeeklyPlannerItem"("plannedDate");

-- CreateIndex
CREATE INDEX "WeeklyPlannerItem_followUpDate_idx" ON "WeeklyPlannerItem"("followUpDate");

-- CreateIndex
CREATE INDEX "WeeklyPlannerItem_department_idx" ON "WeeklyPlannerItem"("department");

-- CreateIndex
CREATE INDEX "AssessmentRecord_department_date_idx" ON "AssessmentRecord"("department", "date");

-- CreateIndex
CREATE INDEX "AssessmentRecord_traineeName_idx" ON "AssessmentRecord"("traineeName");

-- CreateIndex
CREATE UNIQUE INDEX "RefresherRecord_traineeProcessId_key" ON "RefresherRecord"("traineeProcessId");

-- CreateIndex
CREATE INDEX "RefresherRecord_refresherDueDate_idx" ON "RefresherRecord"("refresherDueDate");

-- CreateIndex
CREATE INDEX "FollowUpAction_dueDate_idx" ON "FollowUpAction"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- AddForeignKey
ALTER TABLE "Process" ADD CONSTRAINT "Process_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trainee" ADD CONSTRAINT "Trainee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraineeProcess" ADD CONSTRAINT "TraineeProcess_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraineeProcess" ADD CONSTRAINT "TraineeProcess_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyPlannerItem" ADD CONSTRAINT "WeeklyPlannerItem_traineeProcessId_fkey" FOREIGN KEY ("traineeProcessId") REFERENCES "TraineeProcess"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentRecord" ADD CONSTRAINT "AssessmentRecord_traineeProcessId_fkey" FOREIGN KEY ("traineeProcessId") REFERENCES "TraineeProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefresherRecord" ADD CONSTRAINT "RefresherRecord_traineeProcessId_fkey" FOREIGN KEY ("traineeProcessId") REFERENCES "TraineeProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpAction" ADD CONSTRAINT "FollowUpAction_traineeProcessId_fkey" FOREIGN KEY ("traineeProcessId") REFERENCES "TraineeProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
