ALTER TABLE "Booking" ADD COLUMN "bookingSeriesId" TEXT;

CREATE INDEX "Booking_bookingSeriesId_idx" ON "Booking"("bookingSeriesId");
