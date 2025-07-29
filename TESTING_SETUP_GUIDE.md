# Testing Setup Guide

## Prerequisites Check

### 1. MongoDB Installation Required

The server requires MongoDB to run. You have several options:

#### Option A: Install MongoDB Locally
1. **Download MongoDB Community Server**:
   - Go to: https://www.mongodb.com/try/download/community
   - Download for Windows
   - Install with default settings

2. **Start MongoDB Service**:
   ```bash
   # MongoDB should start automatically as a Windows service
   # If not, you can start it manually:
   net start MongoDB
   ```

#### Option B: Use MongoDB Atlas (Cloud - Recommended)
1. **Create Free Account**:
   - Go to: https://www.mongodb.com/atlas
   - Sign up for free tier
   - Create a cluster

2. **Get Connection String**:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string

3. **Update .env File**:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hrms_leave_db
   ```

#### Option C: Use Docker (Advanced)
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

## Testing Steps

### Step 1: Verify MongoDB Connection

1. **If using local MongoDB**:
   ```bash
   # Check if MongoDB is running
   mongod --version
   ```

2. **If using MongoDB Atlas**:
   - Update your `.env` file with the connection string
   - Make sure to replace `username`, `password`, and `cluster` with your actual values

### Step 2: Start Backend Server

```bash
# In the project root directory
npm start
```

**Expected Output**:
```
HRMS Leave Management Portal running on http://localhost:3000
Environment: development
React dev server should be running on http://localhost:3001
```

### Step 3: Start React Frontend

```bash
# In a new terminal window
cd client
npm start
```

**Expected Output**:
```
Compiled successfully!

You can now view client in the browser.

  Local:            http://localhost:3001
  On Your Network:  http://192.168.x.x:3001
```

### Step 4: Test API Endpoints

1. **Test Backend API**:
   - Open browser: http://localhost:3000
   - Should redirect to: http://localhost:3001

2. **Test React Frontend**:
   - Open browser: http://localhost:3001
   - Should show the React application

3. **Test API Directly**:
   ```bash
   # Test if server is responding
   curl http://localhost:3000/api/auth/login
   ```

## Troubleshooting

### Common Issues

#### 1. MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution**: Install and start MongoDB, or use MongoDB Atlas

#### 2. Port Already in Use
```
Error: listen EADDRINUSE :::3000
```
**Solution**: 
```bash
# Find and kill the process using port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

#### 3. React Dev Server Port Conflict
```
Something is already running on port 3001
```
**Solution**: Choose 'Y' to use a different port, or kill the existing process

#### 4. Module Not Found Errors
```
Cannot find module 'express'
```
**Solution**: Install dependencies
```bash
npm install
cd client && npm install
```

### Testing Checklist

- [ ] MongoDB is installed and running
- [ ] Backend server starts without errors
- [ ] React dev server starts without errors
- [ ] Can access http://localhost:3001
- [ ] API calls work from React frontend
- [ ] Old frontend is no longer accessible

## Quick MongoDB Atlas Setup

1. **Create Account**: https://www.mongodb.com/atlas
2. **Create Cluster**: Choose free tier
3. **Get Connection String**: 
   - Click "Connect" → "Connect your application"
   - Copy the connection string
4. **Update .env**:
   ```env
   MONGODB_URI=mongodb+srv://your-username:your-password@cluster.mongodb.net/hrms_leave_db
   ```

## Next Steps After Testing

1. **If all tests pass**: Proceed to Phase 2 (remove old frontend)
2. **If issues found**: Fix them before proceeding
3. **Document any problems**: For future reference

---

**Need Help?** Check the error messages and refer to the troubleshooting section above. 