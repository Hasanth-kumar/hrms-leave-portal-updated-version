const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? 'env.production' : 'env.development';
try {
  // Fix path resolution - look in the project root directory
  const envFilePath = path.resolve(__dirname, '..', envFile);
  console.log(`Looking for environment file at: ${envFilePath}`);
  
  const envConfig = dotenv.parse(fs.readFileSync(envFilePath));
  
  // Set each environment variable
  for (const key in envConfig) {
    process.env[key] = envConfig[key];
  }
  
  console.log(`Successfully loaded environment from ${envFile}`);
} catch (error) {
  console.error(`Error loading environment file ${envFile}:`, error.message);
  // Continue execution, as we might have environment variables set in the system
}

// Import database connection
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/authRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const adminRoutes = require('./routes/adminRoutes');
const teamRoutes = require('./routes/teamRoutes');

// Import migration service
const { runMigrations } = require('./services/migrationService');

const app = express();
const PORT = process.env.PORT || 3000;

// Increase header size limit to prevent 431 errors
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy - required for express-rate-limit when behind a proxy/load balancer
app.set('trust proxy', 1);

// Create rate limiter (more relaxed for development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit for development
  message: 'Too many requests from this IP, please try again later.'
});

// Apply to all routes (only in production)
if (process.env.NODE_ENV === 'production') {
  app.use('/api/', limiter);
}

// Stricter limit for auth routes (only in production)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Increased from 5 to 20
  skipSuccessfulRequests: true
});

if (process.env.NODE_ENV === 'production') {
  app.use('/api/auth/login', authLimiter);
}

// Middleware - CORS configuration for development
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Access-Control-Allow-Headers'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Increase body parser limits to handle larger requests
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files - only in production, serve React build
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/build')));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/team', teamRoutes);

// Root route
app.get('/', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        res.sendFile(path.join(__dirname, '../client/build/index.html'));
    } else {
        // In development, redirect to React dev server
        res.redirect('http://localhost:3001');
    }
});

// Catch all route for React Router (in production)
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../client/build/index.html'));
    });
}

// Initialize database and start server
const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDB();
        
        // Run migrations to seed initial data
        await runMigrations();
        
        // Start server
        app.listen(PORT, () => {
            console.log(`HRMS Leave Management Portal running on http://localhost:${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            if (process.env.NODE_ENV !== 'production') {
                console.log(`React dev server should be running on http://localhost:3001`);
            }
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer(); 