CREATE TABLE IF NOT EXISTS "ExtraTimeCharge" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "classSessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "scheduledHours" DOUBLE PRECISION NOT NULL,
    "actualHours" DOUBLE PRECISION NOT NULL,
    "extraHours" DOUBLE PRECISION NOT NULL,
    "baseAmount" DOUBLE PRECISION NOT NULL,
    "studentFeeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adminCommissionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tutorAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "studentChargeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeChargeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExtraTimeCharge_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ExtraTimeCharge_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExtraTimeCharge_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExtraTimeCharge_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExtraTimeCharge_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExtraTimeCharge_classSessionId_key" ON "ExtraTimeCharge"("classSessionId");
CREATE INDEX IF NOT EXISTS "ExtraTimeCharge_studentId_status_idx" ON "ExtraTimeCharge"("studentId", "status");
CREATE INDEX IF NOT EXISTS "ExtraTimeCharge_tutorId_status_idx" ON "ExtraTimeCharge"("tutorId", "status");
CREATE INDEX IF NOT EXISTS "ExtraTimeCharge_bookingId_idx" ON "ExtraTimeCharge"("bookingId");
