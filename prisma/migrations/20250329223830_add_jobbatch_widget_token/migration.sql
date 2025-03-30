/*
  Warnings:

  - A unique constraint covering the columns `[widgetToken]` on the table `JobBatch` will be added. If there are existing duplicate values, this will fail.
  - The required column `widgetToken` was added to the `JobBatch` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "JobBatch" ADD COLUMN     "widgetToken" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "JobBatch_widgetToken_key" ON "JobBatch"("widgetToken");

-- CreateIndex
CREATE INDEX "JobBatch_userId_idx" ON "JobBatch"("userId");
