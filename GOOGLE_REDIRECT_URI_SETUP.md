# Google OAuth Redirect URI Setup

## ✅ Credentials Added to .env

Your Google credentials have been added to `backend/.env`.

## 🔧 Configure Redirect URIs in Google Cloud Console

You need to add **both** redirect URIs to your Google Cloud Console:

### Step 1: Go to Google Cloud Console

1. Visit: https://console.cloud.google.com
2. Select your project
3. Go to **APIs & Services > Credentials**
4. Find your OAuth 2.0 Client ID: `440291992108-5g2r0irv65jhhls8r7lv68dauvn0aqk9`
5. Click **Edit** (pencil icon)

### Step 2: Add Authorized Redirect URIs

In the **Authorized redirect URIs** section, add **both**:

1. **Development (Local)**:
   ```
   http://localhost:5000/api/auth/google/callback
   ```

2. **Production (Render)**:
   ```
   https://jtutors.onrender.com/api/auth/google/callback
   ```

### Step 3: Save

Click **Save** at the bottom of the page.

## 📝 Environment Variables

### For Local Development (`backend/.env`):
```env
GOOGLE_CLIENT_ID=440291992108-5g2r0irv65jhhls8r7lv68dauvn0aqk9.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REFRESH_TOKEN=1//04GrjBVeoCIcVCgYIARAAGAQSNwF-L9Ir9sKtwJLDeB3pEoSYAIjahBuYQYYjgfRee9pzM_5HYP-k8Cm3TVorh7UykiF_HkfdbV8
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
```

### For Production (Render.com Environment Variables):

Add these to your Render.com service environment variables:

1. Go to your Render dashboard
2. Select your backend service: `tutor-portal-backend`
3. Go to **Environment** tab
4. Add these variables:

```
GOOGLE_CLIENT_ID=440291992108-5g2r0irv65jhhls8r7lv68dauvn0aqk9.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REFRESH_TOKEN=1//04GrjBVeoCIcVCgYIARAAGAQSNwF-L9Ir9sKtwJLDeB3pEoSYAIjahBuYQYYjgfRee9pzM_5HYP-k8Cm3TVorh7UykiF_HkfdbV8
GOOGLE_REDIRECT_URI=https://jtutors.onrender.com/api/auth/google/callback
```

**Note**: For production, use `https://jtutors.onrender.com/api/auth/google/callback` as the redirect URI.

## ✅ Verification

After adding the redirect URIs in Google Cloud Console:

1. **Test locally**:
   ```bash
   cd backend
   npm run dev
   # Try creating a booking - should create Google Classroom
   ```

2. **Check status** (as admin):
   - Go to Admin Dashboard
   - Check Google Classroom integration status
   - Should show "Configured"

## 🚨 Important Notes

1. **Both URIs Required**: You need both local and production URIs in Google Cloud Console
2. **Exact Match**: The redirect URI must match exactly (including http/https and trailing slashes)
3. **No Trailing Slash**: Make sure there's no trailing slash: `/callback` not `/callback/`
4. **HTTPS for Production**: Production must use `https://`

## 🔍 Troubleshooting

### Error: "redirect_uri_mismatch"

- Check that the URI in Google Cloud Console matches exactly
- Verify you're using the correct URI for your environment (local vs production)
- Make sure there are no extra spaces or characters

### Error: "invalid_grant"

- Your refresh token may have expired
- Regenerate using: `node scripts/get-google-token.js`

### Google Classroom Not Creating

- Check backend logs for errors
- Verify all environment variables are set
- Test the status endpoint: `/api/admin/integrations/google-classroom/status`

