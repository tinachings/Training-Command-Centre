-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Trainee" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "teamLeader" TEXT,
    "trainingAssessor" TEXT,
    "shift" TEXT,
    "startDate" DATETIME,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Trainee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Trainee" ("createdAt", "departmentId", "id", "name", "shift", "startDate", "teamLeader", "trainingAssessor") SELECT "createdAt", "departmentId", "id", "name", "shift", "startDate", "teamLeader", "trainingAssessor" FROM "Trainee";
DROP TABLE "Trainee";
ALTER TABLE "new_Trainee" RENAME TO "Trainee";
CREATE INDEX "Trainee_departmentId_name_idx" ON "Trainee"("departmentId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
