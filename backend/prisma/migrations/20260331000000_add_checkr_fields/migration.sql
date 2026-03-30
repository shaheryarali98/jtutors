-- AlterTable
ALTER TABLE "BackgroundCheck" ADD COLUMN IF NOT EXISTS "checkrCandidateId" TEXT;
ALTER TABLE "BackgroundCheck" ADD COLUMN IF NOT EXISTS "checkrCompletedAt" TIMESTAMP(3);
ALTER TABLE "BackgroundCheck" ADD COLUMN IF NOT EXISTS "checkrInvitationId" TEXT;
ALTER TABLE "BackgroundCheck" ADD COLUMN IF NOT EXISTS "checkrInvitationUrl" TEXT;
ALTER TABLE "BackgroundCheck" ADD COLUMN IF NOT EXISTS "checkrReportId" TEXT;
ALTER TABLE "BackgroundCheck" ADD COLUMN IF NOT EXISTS "checkrStatus" TEXT;
