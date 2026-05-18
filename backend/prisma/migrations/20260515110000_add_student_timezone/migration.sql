-- Add timezone field to Student
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "timezone" TEXT;