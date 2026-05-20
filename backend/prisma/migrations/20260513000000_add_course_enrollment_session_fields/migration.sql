-- ============================================================
-- Add Course, Enrollment tables and new ClassSession fields
-- ============================================================

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
    CONSTRAINT "Course_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

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
    "amount"                DOUBLE PRECISION NOT NULL,
    "tutorAmount"           DOUBLE PRECISION NOT NULL,
    "platformAmount"        DOUBLE PRECISION NOT NULL,
    "basePriceAmount"       DOUBLE PRECISION,
    "studentFeeAmount"      DOUBLE PRECISION,
    "adminCommissionAmount" DOUBLE PRECISION,
    "tutorDeductionAmount"  DOUBLE PRECISION,
    "studentChargeAmount"   DOUBLE PRECISION,
    "paidAt"                TIMESTAMP(3),
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Enrollment_courseId_studentId_key" ON "Enrollment"("courseId", "studentId");

-- --------------------------------------------------------
-- New ClassSession fields for 48-hour dispute window (Option D)
-- --------------------------------------------------------
ALTER TABLE "ClassSession" ADD COLUMN "studentConfirmed"   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClassSession" ADD COLUMN "studentConfirmedAt" TIMESTAMP(3);
ALTER TABLE "ClassSession" ADD COLUMN "autoReleaseAt"      TIMESTAMP(3);
