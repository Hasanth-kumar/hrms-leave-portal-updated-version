#!/bin/bash

# HRMS Leave Portal Environment Setup Script

echo "========================================"
echo "HRMS Leave Portal Environment Setup"
echo "========================================"
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if environment files exist
if [ -f .env.development ] || [ -f .env.production ]; then
    echo "⚠️ Environment files already exist."
    read -p "Do you want to overwrite them? (y/n): " overwrite
    if [ "$overwrite" != "y" ]; then
        echo "✅ Setup aborted. Using existing environment files."
        exit 0
    fi
fi

# Create environment files
echo "🔧 Setting up environment files..."

# Development environment
echo "Creating .env.development..."
mv env.development .env.development 2>/dev/null || cp env.example .env.development

# Production environment
echo "Creating .env.production..."
mv env.production .env.production 2>/dev/null || cp env.example .env.production

# Generate JWT secret
echo "🔑 Generating secure JWT secrets..."
DEV_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
PROD_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# Update JWT secrets in environment files
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$DEV_SECRET/" .env.development
    sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$PROD_SECRET/" .env.production
else
    # Linux/Windows
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=$DEV_SECRET/" .env.development
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=$PROD_SECRET/" .env.production
fi

echo
echo "✅ Environment setup complete!"
echo
echo "📝 Next steps:"
echo "1. Review and update your .env.development and .env.production files"
echo "2. For development: export NODE_ENV=development"
echo "3. For production: export NODE_ENV=production"
echo "4. Start the application with: npm run dev (development) or npm start (production)"
echo
echo "========================================" 