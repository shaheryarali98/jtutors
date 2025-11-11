#!/bin/bash

# Tutor Portal Setup Script
# This script helps you set up the project quickly

echo "🎓 Tutor Portal Setup Script"
echo "=============================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✓ Node.js version: $(node -v)"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL not found. Please ensure PostgreSQL is installed and running."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "📦 Installing backend dependencies..."
cd backend && npm install

echo ""
echo "📦 Installing frontend dependencies..."
cd ../frontend && npm install

cd ..

# Check if database exists
echo ""
echo "🗄️  Database Setup"
echo "=================="
read -p "Do you want to create the database 'tutor_portal'? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    createdb tutor_portal 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✓ Database 'tutor_portal' created successfully"
    else
        echo "⚠️  Database might already exist or creation failed"
    fi
fi

# Setup backend .env
echo ""
echo "⚙️  Backend Configuration"
echo "======================"
if [ ! -f "backend/.env" ]; then
    echo "Creating backend/.env file..."
    cat > backend/.env << 'EOL'
DATABASE_URL="postgresql://postgres:password@localhost:5432/tutor_portal?schema=public"
JWT_SECRET="change-this-to-a-secure-random-string-in-production"
PORT=5000
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key_here"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret_here"
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
EOL
    echo "✓ Created backend/.env"
    echo "⚠️  IMPORTANT: Edit backend/.env and update:"
    echo "   - DATABASE_URL with your PostgreSQL credentials"
    echo "   - JWT_SECRET with a secure random string"
    echo "   - STRIPE_SECRET_KEY with your Stripe test key"
else
    echo "✓ backend/.env already exists"
fi

# Run Prisma migrations
echo ""
echo "🔄 Running database migrations..."
cd backend
npx prisma generate
npx prisma migrate dev --name init

# Seed database
echo ""
read -p "Do you want to seed the database with subjects? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    node scripts/seed.js
fi

cd ..

# Final instructions
echo ""
echo "✅ Setup Complete!"
echo "=================="
echo ""
echo "Next steps:"
echo "1. Edit backend/.env with your configuration"
echo "2. Start the development servers:"
echo "   npm run dev"
echo ""
echo "3. Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5000"
echo ""
echo "4. To view the database:"
echo "   cd backend && npx prisma studio"
echo ""
echo "📖 For more information, see README.md and SETUP_GUIDE.md"
echo ""
echo "Happy coding! 🚀"

