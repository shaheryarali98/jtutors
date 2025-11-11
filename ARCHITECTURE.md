# System Architecture

## 🏗️ High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  ┌────────────────────────────────────────────────────┐     │
│  │  React Frontend (Port 3000)                        │     │
│  │  - React Router for navigation                     │     │
│  │  - Zustand for state management                    │     │
│  │  - Tailwind CSS for styling                        │     │
│  │  - React Hook Form for forms                       │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST API
                            │ (Axios)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        SERVER LAYER                          │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Express.js Backend (Port 5000)                    │     │
│  │  ┌──────────────────────────────────────────────┐ │     │
│  │  │  Routes Layer                                │ │     │
│  │  │  - /api/auth    (Authentication)            │ │     │
│  │  │  - /api/tutor   (Tutor endpoints)           │ │     │
│  │  │  - /api/student (Student endpoints)         │ │     │
│  │  │  - /api/subjects (Subject management)       │ │     │
│  │  └──────────────────────────────────────────────┘ │     │
│  │  ┌──────────────────────────────────────────────┐ │     │
│  │  │  Middleware Layer                            │ │     │
│  │  │  - Authentication (JWT verification)        │ │     │
│  │  │  - Authorization (Role-based access)        │ │     │
│  │  │  - Validation (express-validator)           │ │     │
│  │  │  - Error handling                            │ │     │
│  │  └──────────────────────────────────────────────┘ │     │
│  │  ┌──────────────────────────────────────────────┐ │     │
│  │  │  Controllers Layer                           │ │     │
│  │  │  - Business logic                            │ │     │
│  │  │  - Request/Response handling                 │ │     │
│  │  │  - Data transformation                       │ │     │
│  │  └──────────────────────────────────────────────┘ │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Prisma ORM
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                          │
│  ┌────────────────────────────────────────────────────┐     │
│  │  PostgreSQL Database                               │     │
│  │  - User, Tutor, Student tables                     │     │
│  │  - Experience, Education, Subject tables           │     │
│  │  - Availability, BackgroundCheck tables            │     │
│  │  - Booking table                                   │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                         │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Stripe API                                        │     │
│  │  - Connect account creation                        │     │
│  │  - Payment processing                              │     │
│  │  - Payout management                               │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Frontend Architecture

### Component Hierarchy

```
App.tsx (Root)
├── BrowserRouter
│   ├── HomePage
│   ├── Login
│   ├── Register
│   │
│   ├── TutorDashboard (Protected: TUTOR)
│   │   └── Navbar
│   │       └── ProfileProgress
│   │
│   ├── TutorProfile (Protected: TUTOR)
│   │   ├── Navbar
│   │   ├── ProfileProgress
│   │   └── Profile Sections:
│   │       ├── PersonalInformation
│   │       ├── Experience
│   │       ├── Education
│   │       ├── Subjects
│   │       ├── Availability
│   │       ├── PayoutMethod
│   │       └── BackgroundCheck
│   │
│   └── StudentDashboard (Protected: STUDENT)
│       └── Navbar
```

### State Management

```
Zustand Store (authStore)
├── user: User | null
├── token: string | null
├── setAuth(user, token)
└── logout()

React Query
├── Server state caching
├── Automatic refetching
└── Loading/error states
```

### Routing Structure

```
Public Routes:
  /              → HomePage
  /login         → Login
  /register      → Register

Protected Tutor Routes:
  /tutor/dashboard    → TutorDashboard
  /tutor/profile      → TutorProfile

Protected Student Routes:
  /student/dashboard  → StudentDashboard
```

---

## 🔧 Backend Architecture

### API Endpoint Structure

```
/api
├── /auth
│   ├── POST   /register          # User registration
│   ├── POST   /login              # User login
│   └── GET    /me                 # Get current user
│
├── /tutor (Protected: TUTOR role)
│   ├── /profile
│   │   ├── PUT    /personal                    # Update personal info
│   │   ├── POST   /experience                  # Add experience
│   │   ├── PUT    /experience/:id              # Update experience
│   │   ├── DELETE /experience/:id              # Delete experience
│   │   ├── POST   /education                   # Add education
│   │   ├── PUT    /education/:id               # Update education
│   │   ├── DELETE /education/:id               # Delete education
│   │   ├── POST   /subjects                    # Add subjects
│   │   ├── DELETE /subjects/:subjectId         # Remove subject
│   │   ├── POST   /availability                # Add availability
│   │   ├── PUT    /availability/:id            # Update availability
│   │   ├── DELETE /availability/:id            # Delete availability
│   │   ├── POST   /background-check            # Submit background check
│   │   └── GET    /completion                  # Get profile completion
│   └── /stripe
│       ├── POST   /connect                     # Create Stripe account
│       └── GET    /status                      # Get Stripe status
│
├── /student (Protected: STUDENT role)
│   ├── PUT    /profile                         # Update student profile
│   ├── GET    /tutors                          # Search tutors
│   ├── GET    /tutors/:tutorId                 # Get tutor details
│   ├── POST   /bookings                        # Create booking
│   └── GET    /bookings                        # Get bookings
│
└── /subjects
    ├── GET    /                                # Get all subjects
    └── POST   /                                # Create subject
```

### Middleware Flow

```
Request
  │
  ├─→ CORS Middleware
  │
  ├─→ JSON Parser
  │
  ├─→ Route Handler
  │     │
  │     ├─→ Authentication Middleware (if protected)
  │     │     └─→ JWT Verification
  │     │
  │     ├─→ Authorization Middleware (if role-specific)
  │     │     └─→ Role Check
  │     │
  │     ├─→ Validation Middleware
  │     │     └─→ Input Validation
  │     │
  │     └─→ Controller
  │           └─→ Business Logic
  │                 └─→ Prisma ORM
  │                       └─→ Database
  │
  └─→ Error Handler
        └─→ Response
```

---

## 🗄️ Database Schema

### Entity Relationship Diagram

```
┌─────────────┐
│    User     │
├─────────────┤
│ id (PK)     │
│ email       │
│ password    │
│ role        │
└──────┬──────┘
       │
       ├──────────────────────┐
       │                      │
       ▼                      ▼
┌─────────────┐        ┌─────────────┐
│   Tutor     │        │  Student    │
├─────────────┤        ├─────────────┤
│ id (PK)     │        │ id (PK)     │
│ userId (FK) │        │ userId (FK) │
│ firstName   │        │ firstName   │
│ lastName    │        │ lastName    │
│ hourlyFee   │        └─────────────┘
│ ...         │
└──────┬──────┘
       │
       ├───────────┬──────────┬──────────┬──────────┬──────────┐
       ▼           ▼          ▼          ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│Experience│ │Education │ │TutorSubj │ │Available │ │Background│
│          │ │          │ │          │ │          │ │Check     │
│tutorId FK│ │tutorId FK│ │tutorId FK│ │tutorId FK│ │tutorId FK│
└──────────┘ └──────────┘ └────┬─────┘ └──────────┘ └──────────┘
                                │
                                ▼
                          ┌──────────┐
                          │ Subject  │
                          │          │
                          │ id (PK)  │
                          │ name     │
                          └──────────┘
```

### Key Relationships

- **User** → **Tutor** (One-to-One)
- **User** → **Student** (One-to-One)
- **Tutor** → **Experience** (One-to-Many)
- **Tutor** → **Education** (One-to-Many)
- **Tutor** → **TutorSubject** → **Subject** (Many-to-Many)
- **Tutor** → **Availability** (One-to-Many)
- **Tutor** → **BackgroundCheck** (One-to-One)
- **Tutor** → **Booking** ← **Student** (Many-to-Many through Booking)

---

## 🔐 Authentication Flow

```
1. User Registration
   ┌──────────┐         ┌──────────┐         ┌──────────┐
   │ Frontend │  POST   │ Backend  │  Hash   │ Database │
   │          ├────────→│          ├────────→│          │
   │          │         │          │         │          │
   │          │←────────┤          │←────────┤          │
   │          │  JWT    │          │  User   │          │
   └──────────┘         └──────────┘         └──────────┘

2. User Login
   ┌──────────┐         ┌──────────┐         ┌──────────┐
   │ Frontend │  POST   │ Backend  │  Query  │ Database │
   │          ├────────→│          ├────────→│          │
   │          │         │ Verify   │         │          │
   │          │         │ Password │         │          │
   │          │←────────┤          │         │          │
   │          │  JWT    │ Generate │         │          │
   └──────────┘         │ Token    │         └──────────┘
                        └──────────┘

3. Protected Request
   ┌──────────┐         ┌──────────┐         ┌──────────┐
   │ Frontend │  GET    │ Backend  │  Query  │ Database │
   │          ├────────→│ Verify   ├────────→│          │
   │          │ +JWT    │ Token    │         │          │
   │          │         │          │         │          │
   │          │←────────┤          │←────────┤          │
   │          │  Data   │          │  Data   │          │
   └──────────┘         └──────────┘         └──────────┘
```

---

## 💳 Stripe Integration Flow

```
1. Connect Stripe Account
   ┌──────────┐         ┌──────────┐         ┌──────────┐
   │ Frontend │  POST   │ Backend  │  Create │  Stripe  │
   │          ├────────→│          ├────────→│   API    │
   │          │         │          │         │          │
   │          │←────────┤          │←────────┤          │
   │          │ Onboard │          │ Account │          │
   │          │  URL    │          │  Link   │          │
   └──────────┘         └──────────┘         └──────────┘
         │
         └──────→ User redirected to Stripe
                   │
                   └──────→ Complete onboarding
                              │
                              └──────→ Return to app

2. Check Stripe Status
   ┌──────────┐         ┌──────────┐         ┌──────────┐
   │ Frontend │   GET   │ Backend  │Retrieve │  Stripe  │
   │          ├────────→│          ├────────→│   API    │
   │          │         │          │         │          │
   │          │←────────┤          │←────────┤          │
   │          │ Status  │          │ Account │          │
   │          │         │          │  Info   │          │
   └──────────┘         └──────────┘         └──────────┘
```

---

## 📊 Data Flow Example: Complete Tutor Profile

```
User Action: Save Personal Information
    │
    ▼
Frontend: PersonalInformation.tsx
    │ - Collects form data
    │ - Validates input
    │ - Calls API
    ▼
API Client: lib/api.ts
    │ - Adds JWT token
    │ - Sends PUT request
    ▼
Backend Route: tutor.routes.ts
    │ - Matches route
    │ - Applies middleware
    ▼
Middleware: auth.middleware.ts
    │ - Verifies JWT
    │ - Checks role = TUTOR
    ▼
Controller: tutor.controller.ts
    │ - Validates hourly fee ($20-$500)
    │ - Processes data
    ▼
Prisma ORM
    │ - Generates SQL
    │ - Executes query
    ▼
PostgreSQL Database
    │ - Updates tutor record
    │ - Returns updated data
    ▼
Controller
    │ - Calculates profile completion
    │ - Updates completion percentage
    │ - Formats response
    ▼
Response to Frontend
    │ - JSON with updated data
    │ - Profile completion %
    ▼
Frontend
    - Updates UI
    - Shows success message
    - Refreshes progress bar
```

---

## 🔄 Profile Completion Calculation

```javascript
calculateProfileCompletion(tutor) {
  sections = 8
  completed = 0

  // 1. Personal Info (check key fields)
  if (firstName && lastName && hourlyFee && country && city)
    completed++

  // 2. Experience (at least one)
  if (experiences.length > 0)
    completed++

  // 3. Education (at least one)
  if (educations.length > 0)
    completed++

  // 4. Subjects (at least one)
  if (subjects.length > 0)
    completed++

  // 5. Availability (at least one)
  if (availabilities.length > 0)
    completed++

  // 6. Stripe (fully onboarded)
  if (stripeOnboarded)
    completed++

  // 7. Background Check (submitted)
  if (backgroundCheck exists)
    completed++

  // 8. Profile Image
  if (profileImage)
    completed++

  return (completed / sections) * 100
}
```

---

## 🛡️ Security Architecture

### Security Layers

```
1. Transport Layer
   - HTTPS (in production)
   - CORS configuration

2. Authentication Layer
   - JWT tokens (7-day expiry)
   - bcrypt password hashing (10 rounds)
   - Token verification middleware

3. Authorization Layer
   - Role-based access control
   - Resource ownership verification
   - Protected routes

4. Data Validation Layer
   - express-validator on backend
   - React Hook Form on frontend
   - Type checking with TypeScript

5. Database Layer
   - Parameterized queries (Prisma)
   - SQL injection prevention
   - Cascading deletes

6. Environment Layer
   - Sensitive data in .env
   - .gitignore for secrets
   - Environment-specific configs
```

---

## 🚀 Deployment Architecture (Recommended)

```
┌──────────────────────────────────────────┐
│            CDN (Cloudflare)              │
│         Static Assets Caching            │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│     Frontend (Vercel/Netlify)            │
│     - React production build             │
│     - Automatic HTTPS                    │
│     - Global CDN                         │
└────────────────┬─────────────────────────┘
                 │ API Calls
                 ▼
┌──────────────────────────────────────────┐
│     Backend (Heroku/Railway/Render)      │
│     - Node.js Express server             │
│     - Environment variables              │
│     - Auto-scaling                       │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│     Database (Heroku Postgres/           │
│                Supabase/Railway)         │
│     - Automated backups                  │
│     - Connection pooling                 │
└──────────────────────────────────────────┘
```

---

## 📈 Performance Considerations

### Frontend Optimizations
- Code splitting with React Router
- Lazy loading components
- Memoization where needed
- Debounced search inputs
- Optimistic UI updates

### Backend Optimizations
- Database query optimization
- Proper indexing
- Prisma query optimization
- Response caching (future)
- Rate limiting (future)

### Database Optimizations
- Indexed foreign keys
- Efficient queries
- Connection pooling
- Proper data types

---

## 🔮 Extensibility Points

The architecture supports easy addition of:

1. **Real-time Features**
   - WebSocket integration
   - Socket.io for chat
   - Live notifications

2. **Email Service**
   - SendGrid/Mailgun
   - Email templates
   - Notification system

3. **File Upload**
   - AWS S3 / Cloudinary
   - Profile images
   - Document uploads

4. **Payment Processing**
   - Stripe payment intents
   - Subscription billing
   - Invoice generation

5. **Admin Dashboard**
   - Separate admin routes
   - User management
   - Analytics dashboard

6. **Mobile App**
   - React Native
   - Shared API
   - Push notifications

---

This architecture provides a solid foundation for a scalable, maintainable, and secure tutoring platform! 🚀


