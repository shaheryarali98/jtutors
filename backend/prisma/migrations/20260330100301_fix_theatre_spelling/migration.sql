-- AlterTable
ALTER TABLE "BackgroundCheck" ADD COLUMN     "checkrCandidateId" TEXT,
ADD COLUMN     "checkrCompletedAt" TIMESTAMP(3),
ADD COLUMN     "checkrInvitationId" TEXT,
ADD COLUMN     "checkrInvitationUrl" TEXT,
ADD COLUMN     "checkrReportId" TEXT,
ADD COLUMN     "checkrStatus" TEXT;
