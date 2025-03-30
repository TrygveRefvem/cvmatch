/*
  Warnings:

  - Added the required column `jobDescriptionUrl` to the `JobBatch` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "JobBatch" ADD COLUMN     "jobDescriptionText" TEXT,
ADD COLUMN     "jobDescriptionUrl" TEXT NOT NULL;
