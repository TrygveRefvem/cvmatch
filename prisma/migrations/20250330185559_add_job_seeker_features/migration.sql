-- CreateEnum
CREATE TYPE "JobApplicationStatus" AS ENUM ('NOT_APPLIED', 'APPLIED', 'INTERVIEWING', 'OFFER_RECEIVED', 'ACCEPTED', 'REJECTED_BY_COMPANY', 'WITHDRAWN');

-- DropForeignKey
ALTER TABLE "AnalysisResult" DROP CONSTRAINT "AnalysisResult_jobBatchId_fkey";

-- DropForeignKey
ALTER TABLE "JobBatch" DROP CONSTRAINT "JobBatch_userId_fkey";

-- DropIndex
DROP INDEX "AnalysisResult_userId_createdAt_idx";

-- DropIndex
DROP INDEX "JobBatch_userId_idx";

-- AlterTable
ALTER TABLE "AnalysisResult" ADD COLUMN     "seekerStatus" "JobApplicationStatus",
ALTER COLUMN "status" DROP NOT NULL;

-- CreateTable
CREATE TABLE "JobSeekerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cvText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobSeekerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobSeekerProfile_userId_key" ON "JobSeekerProfile"("userId");

-- AddForeignKey
ALTER TABLE "JobSeekerProfile" ADD CONSTRAINT "JobSeekerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobBatch" ADD CONSTRAINT "JobBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisResult" ADD CONSTRAINT "AnalysisResult_jobBatchId_fkey" FOREIGN KEY ("jobBatchId") REFERENCES "JobBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
