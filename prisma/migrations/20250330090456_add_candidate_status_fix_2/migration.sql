/*
  Warnings:

  - The `role` column on the `User` table is changed from TEXT to UserRole enum. Data loss may occur if values cannot be mapped.
  - The `feedback`, `strengths`, `areasForImprovement` columns on `AnalysisResult` are changed from TEXT to JSONB. Data loss may occur if values are not valid JSON.
  - Made the column `email` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CANDIDATE', 'RECRUITER');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('NEW', 'ROUND_2', 'ROUND_3', 'FINALIST', 'HIRED', 'REJECTED');

-- AlterTable `AnalysisResult`
ALTER TABLE "AnalysisResult"
    DROP COLUMN IF EXISTS "questionsToAsk", -- Drop safely
    ADD COLUMN IF NOT EXISTS "status" "CandidateStatus" NOT NULL DEFAULT 'NEW', -- Add new status column
    ALTER COLUMN "resultJson" DROP NOT NULL, -- Make resultJson optional
    ALTER COLUMN "jobBatchId" DROP NOT NULL; -- Make jobBatchId optional

-- AlterTable `AnalysisResult` - Change TEXT columns to JSONB preserving data
-- Note: This assumes existing data is valid JSON or NULL. Invalid JSON strings will cause errors.
ALTER TABLE "AnalysisResult"
    ALTER COLUMN "areasForImprovement" TYPE JSONB USING "areasForImprovement"::jsonb,
    ALTER COLUMN "feedback" TYPE JSONB USING "feedback"::jsonb,
    ALTER COLUMN "strengths" TYPE JSONB USING "strengths"::jsonb;

-- AlterTable `JobBatch` - Make columns optional
ALTER TABLE "JobBatch"
    ALTER COLUMN "jobDescriptionUrl" DROP NOT NULL,
    ALTER COLUMN "widgetToken" DROP NOT NULL;

-- AlterTable `User`
ALTER TABLE "User"
    DROP COLUMN IF EXISTS "stripeSubscriptionStatus", -- Drop safely
    ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Add safely with default
    ADD COLUMN IF NOT EXISTS "stripeCurrentPeriodEnd" TIMESTAMP(3), -- Add safely
    -- Add updatedAt with default to handle existing rows, then make NOT NULL
    ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN "email" SET NOT NULL; -- Make email required (will fail if NULLs exist)

-- Update existing NULL updatedAt values before making it NOT NULL
UPDATE "User" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL;
ALTER TABLE "User" ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable `User` - Change role from TEXT to Enum preserving data
-- Note: This assumes existing roles are 'ADMIN', 'CANDIDATE', or 'RECRUITER'. Other values will cause errors.

-- Step 1: Drop the default constraint IF IT EXISTS (unlikely for TEXT, but safe)
-- It might fail if the default doesn't exist, depending on PG version. 
-- Consider commenting this out if it causes issues.
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

-- Step 2: Alter the column type using the cast
ALTER TABLE "User"
    ALTER COLUMN "role" TYPE "UserRole" USING "role"::"UserRole";

-- Step 3: Set the new default value *after* the type change
ALTER TABLE "User"
    ALTER COLUMN "role" SET DEFAULT 'CANDIDATE';


-- Foreign Key adjustments (usually handled by Prisma, but included for completeness if needed)
-- It's often safer to let Prisma manage FK constraints unless specific issues arise.
-- If the previous migration dropped them, we might need to re-add them.
-- Check if constraints exist before adding to avoid errors.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'JobBatch_userId_fkey') THEN
        ALTER TABLE "JobBatch" ADD CONSTRAINT "JobBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AnalysisResult_jobBatchId_fkey') THEN
         -- Ensure target column `id` exists on `JobBatch` before adding FK
        ALTER TABLE "AnalysisResult" ADD CONSTRAINT "AnalysisResult_jobBatchId_fkey" FOREIGN KEY ("jobBatchId") REFERENCES "JobBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END;
$$;
