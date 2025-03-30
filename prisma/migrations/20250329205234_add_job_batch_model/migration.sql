-- AlterTable
ALTER TABLE "AnalysisResult" ADD COLUMN     "areasForImprovement" TEXT,
ADD COLUMN     "cvText" TEXT,
ADD COLUMN     "feedback" TEXT,
ADD COLUMN     "jobBatchId" TEXT,
ADD COLUMN     "jobDescriptionText" TEXT,
ADD COLUMN     "questionsToAsk" TEXT,
ADD COLUMN     "strengths" TEXT;

-- CreateTable
CREATE TABLE "JobBatch" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "JobBatch_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AnalysisResult" ADD CONSTRAINT "AnalysisResult_jobBatchId_fkey" FOREIGN KEY ("jobBatchId") REFERENCES "JobBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobBatch" ADD CONSTRAINT "JobBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
