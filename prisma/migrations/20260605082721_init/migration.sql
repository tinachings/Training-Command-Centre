-- CreateTable
CREATE TABLE "Department" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Process" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Process_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Trainee" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "teamLeader" TEXT,
    "trainingAssessor" TEXT,
    "shift" TEXT,
    "startDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Trainee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrainingAssessor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "TeamLeader" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "TrainingBuddy" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "TraineeProcess" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "traineeId" INTEGER NOT NULL,
    "processId" INTEGER NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'Requested',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "department" TEXT NOT NULL,
    "trainingBuddy" TEXT,
    "trainingStartDate" DATETIME,
    "lastCheckInDate" DATETIME,
    "buddyFeedbackScore" INTEGER,
    "assessorObservationScore" INTEGER,
    "timeSpentInShifts" INTEGER,
    "readinessScore" INTEGER,
    "readyForPreAssessment" BOOLEAN NOT NULL DEFAULT false,
    "preAssessmentDate" DATETIME,
    "preAssessmentOutcome" TEXT,
    "assessmentDate" DATETIME,
    "assessmentOutcome" TEXT,
    "competencySignOffDate" DATETIME,
    "nextAction" TEXT,
    "followUpFlag" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TraineeProcess_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TraineeProcess_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeeklyPlannerItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "weekCommencing" DATETIME NOT NULL,
    "plannedDate" DATETIME NOT NULL,
    "department" TEXT NOT NULL,
    "traineeName" TEXT NOT NULL,
    "process" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "owner" TEXT,
    "status" TEXT NOT NULL,
    "actualDate" DATETIME,
    "deviationReason" TEXT,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpDate" DATETIME,
    "traineeProcessId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeeklyPlannerItem_traineeProcessId_fkey" FOREIGN KEY ("traineeProcessId") REFERENCES "TraineeProcess" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssessmentRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "traineeProcessId" INTEGER NOT NULL,
    "assessmentType" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
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
    "followUpDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssessmentRecord_traineeProcessId_fkey" FOREIGN KEY ("traineeProcessId") REFERENCES "TraineeProcess" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RefresherRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "traineeProcessId" INTEGER NOT NULL,
    "department" TEXT NOT NULL,
    "traineeName" TEXT NOT NULL,
    "process" TEXT NOT NULL,
    "lastCompetencyDate" DATETIME,
    "refresherDueDate" DATETIME,
    "status" TEXT NOT NULL,
    "daysUntilDue" INTEGER,
    "assignedAssessor" TEXT,
    "completedDate" DATETIME,
    "outcome" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefresherRecord_traineeProcessId_fkey" FOREIGN KEY ("traineeProcessId") REFERENCES "TraineeProcess" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FollowUpAction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "traineeProcessId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FollowUpAction_traineeProcessId_fkey" FOREIGN KEY ("traineeProcessId") REFERENCES "TraineeProcess" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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
