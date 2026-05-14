-- Add timezone field to Tutor
ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "timezone" TEXT;
