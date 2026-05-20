-- Add jtutorsEmail to Tutor (Google Workspace provisioned email)
ALTER TABLE "Tutor" ADD COLUMN "jtutorsEmail" TEXT;

-- Add stripeCustomerId to Student (for saved payment methods)
ALTER TABLE "Student" ADD COLUMN "stripeCustomerId" TEXT;

-- Add studentFeePercentage to AdminSettings
ALTER TABLE "AdminSettings" ADD COLUMN "studentFeePercentage" DOUBLE PRECISION NOT NULL DEFAULT 4.5;
