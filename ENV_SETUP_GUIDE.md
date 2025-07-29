# Environment Configuration Setup Guide

## Step 1: Create .env File

Copy the `env.example` file to create your `.env` file:

```bash
cp env.example .env
```

## Step 2: Configure Your .env File

Update the following values in your `.env` file:

### Essential Configuration (Required)

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/hrms_leave_db

# Server Configuration
PORT=3000

# JWT Secret (IMPORTANT: Change this!)
JWT_SECRET=your-super-secure-jwt-secret-key-here
```

### Email Configuration (Optional for Development)

For development, you can leave email settings empty to use fake SMTP:

```env
# Email Configuration - Leave empty for development
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=

# Email Settings
FROM_EMAIL=HRMS System <noreply@company.com>
HR_EMAIL=leaves@domain.com
```

### Production Email Configuration

If you want to use real email in development:

```env
# For Gmail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Email Settings
FROM_EMAIL=HRMS System <noreply@company.com>
HR_EMAIL=leaves@domain.com
```

## Step 3: Generate Secure JWT Secret

Generate a secure JWT secret using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and replace `your-super-secure-jwt-secret-key-here` in your `.env` file.

## Step 4: MongoDB Setup

### Option A: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. Use: `MONGODB_URI=mongodb://localhost:27017/hrms_leave_db`

### Option B: MongoDB Atlas (Cloud)
1. Create account at MongoDB Atlas
2. Create a cluster
3. Get connection string
4. Use: `MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hrms_leave_db`

## Step 5: Test Configuration

After setting up your `.env` file:

1. Start the server: `npm start`
2. Check console for any configuration errors
3. Verify database connection

## Security Notes

- ✅ `.env` file is in `.gitignore` (secure)
- ✅ Never commit `.env` file to git
- ✅ Use strong JWT secret in production
- ✅ Use environment variables in production

## Development vs Production

### Development
- Use local MongoDB
- Use fake SMTP (Ethereal Email)
- Simple JWT secret is okay

### Production
- Use MongoDB Atlas or hosted MongoDB
- Configure real SMTP service
- Use strong, unique JWT secret
- Use environment variables for all secrets 