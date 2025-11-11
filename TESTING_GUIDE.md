# Testing Guide

## 🚀 Quick Start Testing

### Step 1: Initial Setup

```bash
# 1. Install all dependencies
npm run install-all

# 2. Create PostgreSQL database
createdb tutor_portal

# 3. Configure backend environment
cd backend
```

Create `backend/.env`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/tutor_portal?schema=public"
JWT_SECRET="test-secret-key-for-development"
PORT=5000
STRIPE_SECRET_KEY="sk_test_51xxxxx"  # Get from Stripe dashboard
STRIPE_WEBHOOK_SECRET="whsec_xxxxx"
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
```

```bash
# 4. Run database migrations
npx prisma generate
npx prisma migrate dev --name init

# 5. Seed database with subjects
node scripts/seed.js

# 6. Start both servers (from root directory)
cd ..
npm run dev
```

The application should now be running:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

---

## 🧪 Manual Testing Scenarios

### Test 1: User Registration (Tutor)

**Steps:**
1. Navigate to http://localhost:3000
2. Click "Register" or "Become a Tutor"
3. Select "Tutor" role
4. Enter email: `tutor@test.com`
5. Enter password: `password123`
6. Confirm password: `password123`
7. Click "Create account"

**Expected Result:**
- ✅ User is registered
- ✅ Redirected to `/tutor/profile`
- ✅ Profile completion shows 0%
- ✅ Token stored in localStorage

**Verification:**
```bash
# Check database
cd backend
npx prisma studio
# Look for new user in User table and related Tutor record
```

---

### Test 2: User Registration (Student)

**Steps:**
1. Logout (if logged in)
2. Click "Register"
3. Select "Student" role
4. Enter email: `student@test.com`
5. Enter password: `password123`
6. Confirm password: `password123`
7. Click "Create account"

**Expected Result:**
- ✅ User is registered
- ✅ Redirected to `/student/dashboard`
- ✅ Can see tutor search interface

---

### Test 3: Login

**Steps:**
1. Logout
2. Click "Login"
3. Enter email: `tutor@test.com`
4. Enter password: `password123`
5. Click "Sign in"

**Expected Result:**
- ✅ Successfully logged in
- ✅ Redirected based on role (tutor → `/tutor/dashboard`, student → `/student/dashboard`)
- ✅ Navbar shows user email
- ✅ Token persists after page refresh

---

### Test 4: Tutor Profile - Personal Information

**Steps:**
1. Login as tutor
2. Go to `/tutor/profile`
3. Click "Personal Information" section
4. Fill in the form:
   - First Name: `John`
   - Last Name: `Doe`
   - Gender: `Male`
   - Select grades: `Grade 9`, `Grade 10`, `Grade 11`, `Grade 12`
   - Hourly Fee: `50`
   - Tagline: `Experienced Math and Science tutor with 5 years of experience`
   - Country: `United States`
   - State: `California`
   - City: `Los Angeles`
   - Address: `123 Main St`
   - Zipcode: `90001`
   - Languages: `English`, `Spanish`
5. Click "Save Personal Information"

**Expected Result:**
- ✅ Success message appears
- ✅ Profile completion increases (should be around 12-15%)
- ✅ Data persists after page refresh

**Validation Tests:**
- Try hourly fee < $20 → Should show error
- Try hourly fee > $500 → Should show error
- Leave required fields empty → Should show validation errors

---

### Test 5: Tutor Profile - Experience

**Steps:**
1. Click "Experience" section
2. Fill in experience form:
   - Job Title: `Math Tutor`
   - Company: `ABC Learning Center`
   - Location: `Los Angeles, CA`
   - Teaching Mode: `Both`
   - Start Date: `2019-01-01`
   - End Date: Leave empty
   - Check "I currently work here"
   - Description: `Teaching algebra and calculus to high school students`
3. Click "Add Experience"

**Expected Result:**
- ✅ Experience appears in the list below
- ✅ Profile completion increases
- ✅ Can edit the experience
- ✅ Can delete the experience

**Additional Tests:**
- Add multiple experiences
- Edit an experience
- Delete an experience
- Add past experience (with end date)

---

### Test 6: Tutor Profile - Education

**Steps:**
1. Click "Education" section
2. Fill in education form:
   - Degree Title: `Bachelor of Science in Mathematics`
   - University: `UCLA`
   - Location: `Los Angeles, CA`
   - Start Date: `2015-09-01`
   - End Date: `2019-06-01`
3. Click "Add Education"

**Expected Result:**
- ✅ Education appears in the list
- ✅ Profile completion increases
- ✅ Can add multiple degrees
- ✅ Can mark degree as ongoing

**Additional Tests:**
- Add ongoing degree (check "This degree is currently ongoing")
- Edit education
- Delete education

---

### Test 7: Tutor Profile - Subjects

**Steps:**
1. Click "Subjects" section
2. Select subjects you can teach:
   - Click `Mathematics`
   - Click `Physics`
   - Click `Chemistry`
   - Click `Algebra`
   - Click `Calculus`
3. Click "Save Subjects"

**Expected Result:**
- ✅ Selected subjects highlighted in blue
- ✅ Success message appears
- ✅ Profile completion increases
- ✅ Selected subjects shown at bottom

**Additional Tests:**
- Deselect a subject and save
- Select many subjects
- Verify subjects persist after refresh

---

### Test 8: Tutor Profile - Availability

**Steps:**
1. Click "Availability" section
2. Fill in availability form:
   - Block Title: `Weekday Afternoon Sessions`
   - Select days: `Monday`, `Tuesday`, `Wednesday`, `Thursday`, `Friday`
   - Start Time: `14:00`
   - End Time: `18:00`
   - Break Time: `15` minutes
   - Session Duration: `60 minutes`
   - Number of Slots: `2`
3. Click "Add Availability"

**Expected Result:**
- ✅ Availability block appears below
- ✅ Shows all selected days
- ✅ Profile completion increases
- ✅ Can add multiple blocks (e.g., weekend hours)

**Additional Tests:**
- Add weekend availability block
- Edit availability
- Delete availability
- Try with different session durations (30, 45, 90, 120 min)

---

### Test 9: Tutor Profile - Payout Method (Stripe)

**Prerequisites:** You need a Stripe account with test keys

**Steps:**
1. Click "Payout Method" section
2. Click "Connect with Stripe"
3. You'll be redirected to Stripe Connect onboarding
4. Fill in Stripe onboarding form (use test data):
   - Business type: Individual
   - Country: United States
   - Email: Use your test email
   - Phone: Use test number
   - Bank account: Use Stripe test bank account numbers
5. Complete onboarding
6. You'll be redirected back to the app

**Expected Result:**
- ✅ Status shows "Stripe Account Connected"
- ✅ Shows "Charges Enabled" and "Payouts Enabled"
- ✅ Profile completion increases
- ✅ Green checkmark displayed

**Note:** For testing without actual Stripe setup, the UI will show the connect button but won't complete the flow without valid Stripe keys.

---

### Test 10: Tutor Profile - Background Check

**Steps:**
1. Click "Background Check" section
2. Fill in all fields:
   - Full Legal First Name: `John`
   - Full Legal Last Name: `Doe`
   - Other Names Used: Leave blank
   - Address Line 1: `123 Main Street`
   - Address Line 2: `Apt 4B`
   - City: `Los Angeles`
   - State/Province: `California`
   - Postal Code: `90001`
   - Country: `United States`
   - Check "lived more than 3 years"
   - Date of Birth: `1990-01-01`
   - SSN: `123-45-6789` (test data)
   - Check "has US driver's license"
   - Email: `john.doe@test.com`
   - Check consent checkbox
3. Click "Submit Background Check"

**Expected Result:**
- ✅ Success message appears
- ✅ Status shows "PENDING"
- ✅ Profile completion increases
- ✅ Can update background check
- ✅ SSN partially hidden in responses

**Validation Tests:**
- Try to submit without consent → Should show error
- Try invalid SSN format → Should show error
- Leave required fields empty → Should show validation errors

---

### Test 11: Profile Completion Tracker

**Steps:**
1. Go to `/tutor/dashboard`
2. Check profile completion percentage
3. Go to `/tutor/profile`
4. Check progress bar at top

**Expected Result:**
After completing all sections:
- ✅ Personal Info: +12.5%
- ✅ Experience: +12.5%
- ✅ Education: +12.5%
- ✅ Subjects: +12.5%
- ✅ Availability: +12.5%
- ✅ Stripe: +12.5%
- ✅ Background Check: +12.5%
- ✅ Profile Image: +12.5% (not yet implemented in UI)
- ✅ Total: 87.5% (or 100% with profile image)

---

### Test 12: Student Dashboard - Browse Tutors

**Steps:**
1. Logout from tutor account
2. Login as student (`student@test.com`)
3. View dashboard at `/student/dashboard`

**Expected Result:**
- ✅ See list of tutors (including the one created)
- ✅ Each tutor card shows:
  - Name
  - Location
  - Hourly fee
  - Tagline
  - Subjects (first 3)
  - Grades
- ✅ "View Profile" button on each card

---

### Test 13: Student Dashboard - Search

**Steps:**
1. In student dashboard
2. Use search bar:
   - Search by name: `John`
   - Search by subject: `Mathematics`
   - Search by location: `Los Angeles`

**Expected Result:**
- ✅ Results filter in real-time
- ✅ Matching tutors displayed
- ✅ Non-matching tutors hidden

---

### Test 14: Protected Routes

**Steps:**
1. Logout
2. Try to access:
   - `/tutor/dashboard`
   - `/tutor/profile`
   - `/student/dashboard`

**Expected Result:**
- ✅ Redirected to `/login`
- ✅ Cannot access without authentication

**Steps 2:**
1. Login as student
2. Try to access `/tutor/dashboard`

**Expected Result:**
- ✅ Redirected to home or appropriate page
- ✅ Cannot access tutor routes as student

---

## 🔍 Database Verification

### Using Prisma Studio

```bash
cd backend
npx prisma studio
```

This opens a GUI at http://localhost:5555

**Check:**
1. **User table**: Verify users created
2. **Tutor table**: Check tutor profiles
3. **Student table**: Check student profiles
4. **Experience table**: Verify experiences added
5. **Education table**: Verify education entries
6. **TutorSubject table**: Check subject associations
7. **Availability table**: Check availability blocks
8. **BackgroundCheck table**: Verify background check submissions
9. **Subject table**: Check seeded subjects

---

## 🧪 API Testing with Postman/Insomnia

### Setup

1. Import this collection or create requests manually
2. Set base URL: `http://localhost:5000/api`

### Test API Endpoints

#### 1. Register User
```
POST /auth/register
Content-Type: application/json

{
  "email": "apitest@test.com",
  "password": "password123",
  "role": "TUTOR"
}

Expected: 201 Created
Response: { token, user }
```

#### 2. Login
```
POST /auth/login
Content-Type: application/json

{
  "email": "apitest@test.com",
  "password": "password123"
}

Expected: 200 OK
Response: { token, user }
```

#### 3. Get Current User
```
GET /auth/me
Authorization: Bearer {token}

Expected: 200 OK
Response: { user with all profile data }
```

#### 4. Update Personal Info
```
PUT /tutor/profile/personal
Authorization: Bearer {token}
Content-Type: application/json

{
  "firstName": "API",
  "lastName": "Test",
  "hourlyFee": 45,
  "city": "New York",
  "country": "USA"
}

Expected: 200 OK
```

#### 5. Add Experience
```
POST /tutor/profile/experience
Authorization: Bearer {token}
Content-Type: application/json

{
  "jobTitle": "Math Tutor",
  "company": "Test School",
  "location": "New York",
  "startDate": "2020-01-01",
  "teachingMode": "ONLINE",
  "isCurrent": true
}

Expected: 201 Created
```

#### 6. Get All Subjects
```
GET /subjects

Expected: 200 OK
Response: { subjects: [...] }
```

#### 7. Search Tutors (as Student)
```
GET /student/tutors?city=Los Angeles
Authorization: Bearer {student_token}

Expected: 200 OK
Response: { tutors: [...] }
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "Port already in use"

**Solution:**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5000 | xargs kill -9
```

### Issue 2: "Database connection failed"

**Solution:**
1. Check PostgreSQL is running:
   ```bash
   # Mac
   brew services list
   
   # Linux
   sudo systemctl status postgresql
   
   # Windows
   Check Services app
   ```

2. Verify DATABASE_URL in `backend/.env`
3. Test connection:
   ```bash
   psql -U postgres -d tutor_portal
   ```

### Issue 3: "Prisma Client not generated"

**Solution:**
```bash
cd backend
npx prisma generate
```

### Issue 4: "Module not found" errors

**Solution:**
```bash
# Clean install
rm -rf node_modules package-lock.json
rm -rf backend/node_modules backend/package-lock.json
rm -rf frontend/node_modules frontend/package-lock.json
npm run install-all
```

### Issue 5: "JWT token invalid"

**Solution:**
1. Logout and login again
2. Clear localStorage in browser DevTools
3. Check JWT_SECRET matches in backend/.env

### Issue 6: Stripe connection fails

**Solution:**
1. Verify STRIPE_SECRET_KEY in backend/.env
2. Use test mode keys (start with `sk_test_`)
3. Check Stripe dashboard for account status
4. Ensure you're using Stripe Connect, not regular Stripe

---

## ✅ Complete Testing Checklist

### Authentication
- [ ] Register as tutor
- [ ] Register as student
- [ ] Login as tutor
- [ ] Login as student
- [ ] Logout
- [ ] Token persists after refresh
- [ ] Protected routes work

### Tutor Profile - Personal Information
- [ ] Fill all fields
- [ ] Validate hourly fee (min $20, max $500)
- [ ] Select multiple grades
- [ ] Add multiple languages
- [ ] Save and verify persistence
- [ ] Profile completion increases

### Tutor Profile - Experience
- [ ] Add experience
- [ ] Edit experience
- [ ] Delete experience
- [ ] Add multiple experiences
- [ ] Mark as current position
- [ ] Verify dates

### Tutor Profile - Education
- [ ] Add education
- [ ] Edit education
- [ ] Delete education
- [ ] Add multiple degrees
- [ ] Mark as ongoing
- [ ] Verify dates

### Tutor Profile - Subjects
- [ ] Select subjects
- [ ] Deselect subjects
- [ ] Save changes
- [ ] Verify persistence
- [ ] View selected subjects

### Tutor Profile - Availability
- [ ] Add availability block
- [ ] Edit availability
- [ ] Delete availability
- [ ] Select multiple days
- [ ] Set different time ranges
- [ ] Configure session duration
- [ ] Set number of slots

### Tutor Profile - Payout
- [ ] Connect Stripe (if keys available)
- [ ] Check connection status
- [ ] Verify UI updates

### Tutor Profile - Background Check
- [ ] Fill all required fields
- [ ] Submit background check
- [ ] Check status
- [ ] Verify consent requirement
- [ ] Test validation

### Student Features
- [ ] View tutor list
- [ ] Search tutors
- [ ] Filter results
- [ ] View tutor profiles
- [ ] Responsive design

### General
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Error messages display
- [ ] Success messages display
- [ ] Loading states work
- [ ] Navigation works
- [ ] Logout works everywhere

---

## 📊 Performance Testing

### Browser DevTools

1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Perform actions and check:
   - API response times (should be < 500ms)
   - Payload sizes
   - Number of requests

### Lighthouse Audit

1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Run audit
4. Check scores for:
   - Performance
   - Accessibility
   - Best Practices
   - SEO

---

## 🔐 Security Testing

### Test Authentication
- [ ] Cannot access protected routes without login
- [ ] Student cannot access tutor routes
- [ ] Tutor cannot access student routes
- [ ] Token expires after 7 days
- [ ] Invalid tokens rejected

### Test Input Validation
- [ ] SQL injection prevented (Prisma handles this)
- [ ] XSS prevented (React escapes by default)
- [ ] Form validation works
- [ ] API validation works
- [ ] Error messages don't leak sensitive info

---

## 📱 Responsive Design Testing

Test on different screen sizes:
- [ ] Mobile (375px width)
- [ ] Tablet (768px width)
- [ ] Desktop (1024px+ width)

Or use Chrome DevTools device mode (Ctrl+Shift+M)

---

## 🎯 User Acceptance Testing

### Scenario 1: New Tutor Onboarding
1. Register as tutor
2. Complete all 8 profile sections
3. Reach 100% profile completion
4. Verify can be found by students

### Scenario 2: Student Finding Tutor
1. Register as student
2. Search for math tutor
3. View tutor profile
4. Check hourly rate and availability

### Scenario 3: Profile Updates
1. Login as tutor
2. Update personal information
3. Add new experience
4. Update availability
5. Verify all changes persist

---

## 📝 Test Data

### Test Accounts
```
Tutor:
- Email: tutor@test.com
- Password: password123

Student:
- Email: student@test.com
- Password: password123
```

### Test Stripe Data (for Stripe Connect testing)
```
Test Bank Account:
- Routing: 110000000
- Account: 000123456789

Test SSN: 000-00-0000
Test EIN: 00-0000000
```

---

## 🚀 Next Steps After Testing

1. ✅ Fix any bugs found
2. ✅ Optimize performance issues
3. ✅ Add more test coverage
4. ✅ Implement additional features
5. ✅ Deploy to staging environment
6. ✅ User acceptance testing
7. ✅ Deploy to production

---

**Happy Testing! 🧪✨**

If you find any issues, check the error logs in:
- Browser Console (F12)
- Backend terminal
- Database (Prisma Studio)


