-- ============================================================
-- Comprehensive migration: missing tables and columns
-- All statements use IF NOT EXISTS / IF NOT EXISTS for safety
-- ============================================================

-- --------------------------------------------------------
-- Missing columns in existing tables
-- --------------------------------------------------------
ALTER TABLE "AdminSettings" ADD COLUMN IF NOT EXISTS "studentFeePercentage" DOUBLE PRECISION NOT NULL DEFAULT 4.5;
ALTER TABLE "AdminSettings" ADD COLUMN IF NOT EXISTS "adminPaymentInfo" TEXT;
ALTER TABLE "Student"       ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "Tutor"         ADD COLUMN IF NOT EXISTS "jtutorsEmail" TEXT;

-- --------------------------------------------------------
-- Conversation table
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Conversation" (
    "id"            TEXT NOT NULL,
    "studentId"     TEXT NOT NULL,
    "tutorId"       TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Conversation_studentId_tutorId_key" ON "Conversation"("studentId", "tutorId");
DO $$ BEGIN
    ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_studentId_fkey"
        FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_tutorId_fkey"
        FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- --------------------------------------------------------
-- Message table
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Message" (
    "id"             TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId"       TEXT NOT NULL,
    "senderRole"     TEXT NOT NULL,
    "content"        TEXT NOT NULL,
    "read"           BOOLEAN NOT NULL DEFAULT false,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
    ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey"
        FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- --------------------------------------------------------
-- TutorRequest table
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS "TutorRequest" (
    "id"                TEXT NOT NULL,
    "studentId"         TEXT NOT NULL,
    "title"             TEXT NOT NULL,
    "description"       TEXT NOT NULL,
    "subject"           TEXT,
    "grade"             TEXT,
    "budgetMin"         DOUBLE PRECISION,
    "budgetMax"         DOUBLE PRECISION,
    "preferredSchedule" TEXT,
    "sessionType"       TEXT,
    "status"            TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TutorRequest_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
    ALTER TABLE "TutorRequest" ADD CONSTRAINT "TutorRequest_studentId_fkey"
        FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- --------------------------------------------------------
-- Course table
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Course" (
    "id"          TEXT NOT NULL,
    "tutorId"     TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price"       DOUBLE PRECISION NOT NULL,
    "schedule"    TEXT,
    "meetingLink" TEXT,
    "meetingType" TEXT,
    "maxStudents" INTEGER,
    "status"      TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
    ALTER TABLE "Course" ADD CONSTRAINT "Course_tutorId_fkey"
        FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- --------------------------------------------------------
-- Enrollment table
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Enrollment" (
    "id"                    TEXT NOT NULL,
    "courseId"              TEXT NOT NULL,
    "studentId"             TEXT NOT NULL,
    "status"                TEXT NOT NULL DEFAULT 'PENDING',
    "stripeSessionId"       TEXT,
    "stripePaymentIntentId" TEXT,
    "amount"                DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tutorAmount"           DOUBLE PRECISION NOT NULL DEFAULT 0,
    "platformAmount"        DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAt"                TIMESTAMP(3),
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Enrollment_courseId_studentId_key" ON "Enrollment"("courseId", "studentId");
DO $$ BEGIN
    ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseId_fkey"
        FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey"
        FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
