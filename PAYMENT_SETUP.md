# Payment and Integration Setup Guide

This guide explains how to set up Stripe payments, Google Classroom integration, and configure the withdrawal system.

## Stripe Setup

### 1. Get Stripe API Keys

1. Sign up for a Stripe account at https://stripe.com
2. Go to Developers > API keys
3. Copy your **Secret Key** (starts with `sk_`)
4. Copy your **Publishable Key** (starts with `pk_`) - you'll need this for the frontend

### 2. Configure Environment Variables

Add to your `.env` file in the backend:

```env
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key
ADMIN_STRIPE_ACCOUNT_ID=acct_... # Optional: Admin Stripe account ID for payouts
```

### 3. Stripe Webhooks (Optional but Recommended)

For production, set up webhooks to handle payment confirmations:

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select events:
   - `payment_intent.succeeded`
   - `payout.paid`
   - `transfer.created`
4. Copy the webhook signing secret to your `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### 4. Tutor Stripe Onboarding

Tutors need to connect their Stripe accounts to receive payments:

1. The system will create a Stripe Connect account for each tutor
2. Tutors will be redirected to Stripe's onboarding flow
3. Once onboarded, they can receive transfers and create payouts

## Google Classroom Setup

### 1. Create Google Cloud Project

1. Go to https://console.cloud.google.com
2. Create a new project or select an existing one
3. Enable the **Google Classroom API**:
   - Go to APIs & Services > Library
   - Search for "Google Classroom API"
   - Click Enable

### 2. Create OAuth 2.0 Credentials

1. Go to APIs & Services > Credentials
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application"
4. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback` (development)
   - `https://yourdomain.com/api/auth/google/callback` (production)
5. Download the credentials JSON file

### 3. Get Refresh Token

You'll need to authenticate once to get a refresh token:

1. Use the OAuth 2.0 Playground: https://developers.google.com/oauthplayground/
2. Select "Google Classroom API v1"
3. Authorize and get the refresh token

### 4. Configure Environment Variables

Add to your `.env` file:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
```

## Commission Configuration

The admin commission is configured in the Admin Dashboard:

1. Go to Admin Dashboard > Settings tab
2. Set **Admin Commission Percentage** (default: 10.0%)
3. Set **Admin Commission Fixed Fee** (default: $0.00)
4. Commission calculation: `(amount * percentage / 100) + fixed_fee`

Example:
- Student pays: $100.00
- Commission: 10% + $0.00 = $10.00
- Tutor receives: $90.00

## Withdrawal System

### Auto-Approval Settings

1. Go to Admin Dashboard > Settings tab
2. Set **Auto-Approve After Days**:
   - Enter a number (e.g., `2`) for automatic approval after N days
   - Leave empty for manual approval only
   - Default: 2 days (sandbox mode)

### Withdrawal Workflow

1. **Tutor/Admin requests withdrawal** → Status: PENDING
2. **Auto-approval check** (if enabled) → Status: APPROVED (after N days)
3. **Manual approval** (admin) → Status: APPROVED
4. **Stripe payout created** → Status: PROCESSING
5. **Payout completed** → Status: COMPLETED

## Email Templates

### Default Templates

The system includes these email templates:

- `SIGNUP_SUCCESS` - Welcome email after signup
- `PROFILE_COMPLETE` - Profile completion notification
- `EMAIL_VERIFICATION` - Email verification link
- `FORGOT_PASSWORD` - Password reset link
- `CLASS_APPROVED` - Class approval notification
- `PAYMENT_RECEIVED` - Payment confirmation
- `WITHDRAWAL_APPROVED` - Withdrawal approval
- `WITHDRAWAL_REJECTED` - Withdrawal rejection

### Customizing Templates

1. Go to Admin Dashboard > Email Templates tab
2. Click "Edit" on any template
3. Use `{{variableName}}` for dynamic content
4. Available variables are shown in the template editor

### Initialize Default Templates

If templates are missing, click "Initialize Defaults" in the Email Templates tab.

## Database Migration

Run the migration to create the new tables:

```bash
cd backend
npm run prisma:migrate
```

This will create:
- `Payment` table
- `Withdrawal` table
- `ClassSession` table
- `EmailTemplate` table
- Updated `AdminSettings` table

## Testing

### Stripe Test Mode

Use Stripe's test mode for development:
- Test card: `4242 4242 4242 4242`
- Any future expiry date
- Any 3-digit CVC
- Any ZIP code

### Google Classroom

In development, Google Classroom integration will create placeholder Meet links if credentials are not configured.

## Production Checklist

- [ ] Switch Stripe to live mode
- [ ] Update Google OAuth redirect URIs
- [ ] Set up Stripe webhooks
- [ ] Configure production email SMTP
- [ ] Set appropriate withdrawal auto-approve days
- [ ] Review and customize all email templates
- [ ] Test payment flow end-to-end
- [ ] Test withdrawal flow end-to-end
- [ ] Test class approval workflow

