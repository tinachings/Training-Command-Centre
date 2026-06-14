-- CreateIndex
CREATE UNIQUE INDEX "Trainee_name_departmentId_shift_key" ON "Trainee"("name", "departmentId", "shift");
