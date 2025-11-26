# Google Classroom Integration with Automatic Payment Release

## Overview

This document describes the complete Google Classroom integration with automatic payment release functionality. When a class is completed, payment is automatically released to the tutor based on the hours taught.

## Features Implemented

### 1. Google Classroom Integration

- **Automatic Course Creation**: When a booking is created, a Google Classroom course is automatically created
- **Student & Tutor Enrollment**: Both student and tutor are automatically added to the Google Classroom course
- **Google Meet Links**: Proper Google Meet links are created via Google Calendar API for video conferencing
- **Frontend Access**: Students and tutors can access Google Classroom and Meet links directly from their dashboards

### 2. Automatic Payment Release

- **Hours Tracking**: Tutors can specify actual hours taught when completing a class
- **Automatic Calculation**: Payment is calculated based on actual hours taught (if provided) or scheduled hours
- **Stripe Transfer**: Payment is automatically transferred to tutor's Stripe Connect account when class is completed
- **Commission Handling**: Admin commission is automatically deducted before transferring to tutor

### 3. Database Schema Updates

Added to `ClassSession` model:
- `actualHoursTaught`: Float field to track actual hours taught
- `paymentReleased`: Boolean to track if payment has been released
- `paymentReleasedAt`: DateTime to track when payment was released

## Workflow

### Booking Flow

1. **Student creates booking** → Booking is created in database
2. **Google Classroom created** → Course is automatically created with student and tutor enrolled
3. **Google Meet link generated** → Meet link is created via Calendar API
4. **Class session created** → ClassSession record is created with Google Classroom links

### Class Completion Flow

1. **Tutor completes class** → Tutor marks class as completed (optionally with actual hours)
2. **Payment check** → System checks if payment is already paid
3. **Automatic release** → If payment is paid, funds are automatically transferred to tutor's Stripe account
4. **Email notification** → Tutor receives email confirmation of payment release

### Payment Calculation

- If `actualHoursTaught` is provided:
  - Calculate hourly rate from booking: `hourlyRate = totalAmount / scheduledHours`
  - Calculate total for actual hours: `totalForHours = hourlyRate * actualHoursTaught`
  - Apply commission: `tutorAmount = totalForHours - commission`
- If `actualHoursTaught` is not provided:
  - Use scheduled hours from booking
  - Apply commission: `tutorAmount = scheduledAmount - commission`

## API Endpoints

### Class Session Endpoints

- `POST /api/class-sessions` - Create class session (with Google Classroom)
- `POST /api/class-sessions/:id/complete` - Complete class session (with optional hours)
- `POST /api/class-sessions/:id/approve` - Admin approve class session
- `POST /api/class-sessions/:id/release-payment` - Manually release payment (admin only)
- `GET /api/class-sessions/my` - Get my class sessions (student/tutor)
- `GET /api/class-sessions/:id` - Get class session details

### Complete Class Session Request

```json
{
  "notes": "Optional notes about the class",
  "actualHoursTaught": 1.5  // Optional: actual hours taught
}
```

## Environment Variables Required

```env
# Google Classroom API
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# Stripe (for payment release)
STRIPE_SECRET_KEY=your_stripe_secret_key
```

## Frontend Integration

### Student Bookings Page

- Displays Google Classroom and Meet links when available
- Shows class status and payment status
- Allows students to join classes directly from the platform

### Tutor Sessions Page

- Displays Google Classroom and Meet links for each session
- Shows payment release status
- Allows tutors to complete classes with hours tracking

## Error Handling

- If Google Classroom creation fails, booking still succeeds (graceful degradation)
- If payment release fails, it can be retried manually by admin
- All errors are logged for debugging

## Migration Required

Run the following migration to add new fields to ClassSession:

```bash
cd backend
npx prisma migrate dev --name add_payment_release_fields
```

## Testing

1. Create a booking as a student
2. Verify Google Classroom is created automatically
3. Complete the class as a tutor (with hours)
4. Verify payment is automatically released
5. Check tutor's Stripe account for transfer

## Future Enhancements

- Google Calendar event creation for bookings
- Automatic reminders via Google Classroom
- Attendance tracking via Google Classroom
- Recording links from Google Meet
- Multi-session course support

