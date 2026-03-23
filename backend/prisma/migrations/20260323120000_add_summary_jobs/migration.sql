-- CreateEnum
CREATE TYPE "SummaryJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "summary_jobs" (
    "id" TEXT NOT NULL,
    "publication_id" TEXT NOT NULL,
    "status" "SummaryJobStatus" NOT NULL DEFAULT 'PENDING',
    "total_steps" INTEGER NOT NULL DEFAULT 0,
    "completed_steps" INTEGER NOT NULL DEFAULT 0,
    "current_step" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "summary_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "summary_jobs_publication_id_idx" ON "summary_jobs"("publication_id");

-- CreateIndex
CREATE INDEX "summary_jobs_status_idx" ON "summary_jobs"("status");

-- CreateIndex
CREATE INDEX "summary_jobs_publication_id_status_idx" ON "summary_jobs"("publication_id", "status");

-- AddForeignKey
ALTER TABLE "summary_jobs" ADD CONSTRAINT "summary_jobs_publication_id_fkey" FOREIGN KEY ("publication_id") REFERENCES "publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
