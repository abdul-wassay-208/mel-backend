/*
  Warnings:

  - You are about to drop the column `projectId` on the `Objective` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Objective" DROP CONSTRAINT "Objective_projectId_fkey";

-- AlterTable
ALTER TABLE "Objective" DROP COLUMN "projectId";

-- CreateTable
CREATE TABLE "ProjectObjective" (
    "projectId" INTEGER NOT NULL,
    "objectiveId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectObjective_pkey" PRIMARY KEY ("projectId","objectiveId")
);

-- CreateIndex
CREATE INDEX "ProjectObjective_projectId_idx" ON "ProjectObjective"("projectId");

-- CreateIndex
CREATE INDEX "ProjectObjective_objectiveId_idx" ON "ProjectObjective"("objectiveId");

-- AddForeignKey
ALTER TABLE "ProjectObjective" ADD CONSTRAINT "ProjectObjective_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectObjective" ADD CONSTRAINT "ProjectObjective_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE CASCADE ON UPDATE CASCADE;
