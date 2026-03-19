-- AlterTable
ALTER TABLE "Tutor" ADD COLUMN "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Student" ADD COLUMN "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);
