-- AlterTable
ALTER TABLE "BackgroundCheck" ADD COLUMN "checkrCandidateId" TEXT;
ALTER TABLE "BackgroundCheck" ADD COLUMN "checkrCompletedAt" TIMESTAMP(3);
ALTER TABLE "BackgroundCheck" ADD COLUMN "checkrInvitationId" TEXT;
ALTER TABLE "BackgroundCheck" ADD COLUMN "checkrInvitationUrl" TEXT;
ALTER TABLE "BackgroundCheck" ADD COLUMN "checkrReportId" TEXT;
ALTER TABLE "BackgroundCheck" ADD COLUMN "checkrStatus" TEXT;
