# Tutor & Student Portal

A comprehensive web application connecting tutors with students. Tutors can create detailed profiles, set their availability, and receive payments through Stripe. Students can search for tutors, view profiles, and book sessions.

## Features

### For Tutors
- ✅ Complete profile setup with 8 sections
- 📝 Personal Information (contact details, hourly fee, languages)
- 💼 Teaching Experience management
- 🎓 Education history
- 📚 Subject selection
- 📅 Availability & calendar management
- 💳 Stripe payment integration
- ✓ Background check submission
- 📊 Profile completion progress tracker

### For Students
- 🔍 Search and filter tutors
- 👤 View detailed tutor profiles
- 📅 Book tutoring sessions
- 💬 Rate and review tutors

## Tech Stack

### Backend
- Node.js + Express
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Stripe API
- bcrypt for password hashing

### Frontend
- React 18
- TypeScript
- Vite
- React Router
- React Hook Form
- Tailwind CSS
- Zustand (state management)
- Axios
- React Query

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn
- Stripe account (for payment processing)

## Installation & Setup

### 1. Clone the repository

```bash
cd tutor
```

### 2. Install dependencies

```bash
npm run install-all
```

This will install dependencies for both backend and frontend.

### 3. Set up the database

Create a PostgreSQL database:

```bash
createdb tutor_portal
```

### 4. Configure environment variables

Create a `.env` file in the `backend` directory:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/tutor_portal?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
PORT=5000
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
```

**Important:** Replace the database credentials and Stripe keys with your actual values.

### 5. Run database migrations

```bash
cd backend
npm run prisma:migrate
npm run prisma:generate
```

### 6. Seed initial data (optional)

Create some initial subjects by running the seed script:

```bash
node scripts/seed.js
```

### 7. Start the development servers

From the root directory:

```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:5000`
- Frontend app on `http://localhost:3000`

## Project Structure

```
tutor/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Database schema
│   ├── src/
│   │   ├── controllers/           # Route controllers
│   │   ├── middleware/            # Auth & other middleware
│   │   ├── routes/                # API routes
│   │   └── server.ts              # Express server setup
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/            # React components
│   │   │   └── tutor/             # Tutor profile components
│   │   ├── pages/                 # Page components
│   │   │   ├── auth/              # Login & Register
│   │   │   ├── tutor/             # Tutor dashboard & profile
│   │   │   └── student/           # Student dashboard
│   │   ├── lib/                   # Utilities & API client
│   │   ├── store/                 # Zustand stores
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
└── package.json                   # Root package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Tutor Routes (Protected)
- `PUT /api/tutor/profile/personal` - Update personal info
- `POST /api/tutor/profile/experience` - Add experience
- `PUT /api/tutor/profile/experience/:id` - Update experience
- `DELETE /api/tutor/profile/experience/:id` - Delete experience
- `POST /api/tutor/profile/education` - Add education
- `PUT /api/tutor/profile/education/:id` - Update education
- `DELETE /api/tutor/profile/education/:id` - Delete education
- `POST /api/tutor/profile/subjects` - Add subjects
- `DELETE /api/tutor/profile/subjects/:subjectId` - Remove subject
- `POST /api/tutor/profile/availability` - Add availability
- `PUT /api/tutor/profile/availability/:id` - Update availability
- `DELETE /api/tutor/profile/availability/:id` - Delete availability
- `POST /api/tutor/profile/background-check` - Submit background check
- `POST /api/tutor/stripe/connect` - Create Stripe account
- `GET /api/tutor/stripe/status` - Get Stripe status
- `GET /api/tutor/profile/completion` - Get profile completion %

### Student Routes (Protected)
- `PUT /api/student/profile` - Update student profile
- `GET /api/student/tutors` - Search tutors
- `GET /api/student/tutors/:tutorId` - Get tutor details
- `POST /api/student/bookings` - Create booking
- `GET /api/student/bookings` - Get student bookings

### Public Routes
- `GET /api/subjects` - Get all subjects
- `POST /api/subjects` - Create subject (should be admin-only in production)

## Database Schema

The application uses Prisma ORM with PostgreSQL. Key models include:

- **User** - Base authentication (email, password, role)
- **Tutor** - Tutor profile with all details
- **Student** - Student profile
- **Experience** - Teaching experience entries
- **Education** - Education history
- **Subject** - Available subjects
- **TutorSubject** - Many-to-many relation
- **Availability** - Tutor availability blocks
- **BackgroundCheck** - Background check information
- **Booking** - Session bookings

## Stripe Integration

The app uses Stripe Connect for tutor payments:

1. Tutors click "Connect with Stripe" in the Payout Method section
2. They're redirected to Stripe's onboarding flow
3. After completion, they can receive payments from students
4. The backend tracks Stripe account status and onboarding completion

### Setting up Stripe

1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Stripe Dashboard
3. Set up Stripe Connect in your dashboard
4. Add the keys to your `.env` file

## Security Considerations

⚠️ **Important for Production:**

1. **Environment Variables**: Never commit `.env` files
2. **JWT Secret**: Use a strong, random secret
3. **SSN Encryption**: The current implementation stores SSN in plain text. In production, encrypt sensitive data
4. **HTTPS**: Always use HTTPS in production
5. **CORS**: Configure CORS properly for your domain
6. **Rate Limiting**: Add rate limiting to prevent abuse
7. **Input Validation**: All inputs are validated, but review for your use case
8. **Password Policy**: Consider adding password strength requirements

## Development

### Backend Development

```bash
cd backend
npm run dev          # Start dev server with hot reload
npm run build        # Build TypeScript
npm run start        # Run production build
npm run prisma:studio # Open Prisma Studio (DB GUI)
```

### Frontend Development

```bash
cd frontend
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

## Common Issues & Solutions

### Database Connection Issues
- Ensure PostgreSQL is running
- Check database credentials in `.env`
- Verify database exists: `psql -l`

### Stripe Integration Issues
- Verify Stripe keys are correct
- Check Stripe webhook configuration
- Ensure return URLs are correct

### Port Already in Use
- Change ports in `backend/.env` (PORT) and `frontend/vite.config.ts`

## Future Enhancements

- [ ] Real-time chat between tutors and students
- [ ] Video call integration (Zoom/Google Meet)
- [ ] Advanced search filters
- [ ] Reviews and ratings system
- [ ] Email notifications
- [ ] Admin dashboard
- [ ] Payment history and invoicing
- [ ] Mobile app (React Native)
- [ ] Google Calendar integration
- [ ] Multi-language support

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support, email support@tutorportal.com or open an issue in the repository.

---

**Built with ❤️ for connecting tutors and students worldwide**

