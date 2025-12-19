#!/bin/bash

# Production Build Script for Mac/Linux
# This builds the frontend with the correct API URL

echo ""
echo "========================================"
echo "  Building Frontend for Production"
echo "========================================"
echo ""

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "[WARNING] .env.production file not found!"
    echo "Creating .env.production from template..."
    cp .env.production.example .env.production
    echo "[OK] Created .env.production"
    echo ""
fi

echo "[INFO] Building with production settings..."
echo "[INFO] API URL will be: https://jtutors.onrender.com/api"
echo ""

# Build the project
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "[INFO] Copying .htaccess to dist folder..."
    if [ -f ".htaccess" ]; then
        cp ".htaccess" "dist/.htaccess"
        echo "[OK] .htaccess copied to dist folder"
    fi
    echo ""
    echo "========================================"
    echo "  Build Successful!"
    echo "========================================"
    echo ""
    echo "Output folder: dist/"
    echo ""
    echo "Next steps:"
    echo "1. Upload the contents of dist/ to your hosting"
    echo "2. For Apache servers: Ensure .htaccess is in dist/ folder"
    echo "3. For Netlify: _redirects file is automatically included"
    echo "4. For Vercel: vercel.json handles routing"
    echo "5. Deploy to your hosting platform"
    echo ""
else
    echo ""
    echo "[ERROR] Build failed!"
    echo "Check the error messages above."
    echo ""
    exit 1
fi

