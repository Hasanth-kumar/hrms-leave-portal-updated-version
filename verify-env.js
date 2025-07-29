/**
 * Environment Variable Verification Script
 * 
 * This script checks if all required environment variables are set
 * and provides helpful feedback for missing or potentially problematic values.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Determine which env file to use
const envFile = process.env.NODE_ENV === 'production' ? 'env.production' : 'env.development';
console.log(`Using environment file: ${envFile}`);

// Load environment variables from the file
try {
  const envFilePath = path.resolve(__dirname, envFile);
  console.log(`Looking for environment file at: ${envFilePath}`);
  
  const envConfig = dotenv.parse(fs.readFileSync(envFilePath));
  
  // Set each environment variable
  for (const key in envConfig) {
    process.env[key] = envConfig[key];
  }
  
  console.log(`Successfully loaded environment from ${envFile}`);
} catch (error) {
  console.error(`Error loading environment file ${envFile}:`, error.message);
  process.exit(1);
}

// Define required environment variables
const requiredVars = [
  { name: 'MONGODB_URI', message: 'MongoDB connection string is required' },
  { name: 'JWT_SECRET', message: 'JWT secret key is required for authentication' },
  { name: 'PORT', defaultValue: '3000', message: 'Server port (defaults to 3000)' }
];

// Define optional but recommended variables
const recommendedVars = [
  { name: 'NODE_ENV', defaultValue: 'development', message: 'Environment mode (development/production)' },
  { name: 'FRONTEND_URL', message: 'Frontend URL for CORS configuration' },
  { name: 'SMTP_HOST', message: 'SMTP host for email sending' },
  { name: 'SMTP_USER', message: 'SMTP username for email sending' },
  { name: 'SMTP_PASS', message: 'SMTP password for email sending' }
];

// Check for missing required variables
console.log('\n=== ENVIRONMENT VERIFICATION ===\n');
console.log(`Using ${process.env.NODE_ENV || 'development'} environment\n`);

let missingRequired = false;
let warnings = [];

// Check required variables
console.log('REQUIRED VARIABLES:');
requiredVars.forEach(variable => {
  const value = process.env[variable.name];
  
  if (!value) {
    console.log(`❌ ${variable.name}: MISSING - ${variable.message}`);
    missingRequired = true;
  } else if (variable.name === 'JWT_SECRET' && value.length < 32) {
    console.log(`⚠️ ${variable.name}: SET BUT TOO SHORT - JWT secret should be at least 32 characters`);
    warnings.push(`JWT_SECRET is too short (${value.length} chars). Generate a stronger one with 'npm run generate-jwt'`);
  } else if (variable.name === 'JWT_SECRET' && (value === 'your-secret-key-here-change-in-production' || value === 'your-super-secure-jwt-secret-key-here')) {
    console.log(`❌ ${variable.name}: DEFAULT VALUE - Please change the default JWT secret`);
    missingRequired = true;
  } else {
    // Mask sensitive values
    const displayValue = variable.name === 'JWT_SECRET' 
      ? `${value.substring(0, 3)}...${value.substring(value.length - 3)}` 
      : value;
    console.log(`✅ ${variable.name}: ${displayValue}`);
  }
});

// Check recommended variables
console.log('\nRECOMMENDED VARIABLES:');
recommendedVars.forEach(variable => {
  const value = process.env[variable.name];
  
  if (!value && variable.defaultValue) {
    console.log(`ℹ️ ${variable.name}: USING DEFAULT - ${variable.defaultValue}`);
  } else if (!value) {
    console.log(`⚠️ ${variable.name}: NOT SET - ${variable.message}`);
    warnings.push(`${variable.name} is not set. ${variable.message}`);
  } else {
    // Mask sensitive values
    const displayValue = variable.name === 'SMTP_PASS' 
      ? '********' 
      : value;
    console.log(`✅ ${variable.name}: ${displayValue}`);
  }
});

// Special checks
if (process.env.NODE_ENV === 'production') {
  // Check for development values in production
  if (process.env.MONGODB_URI && process.env.MONGODB_URI.includes('localhost')) {
    console.log('\n⚠️ WARNING: Using localhost MongoDB in production environment');
    warnings.push('Using localhost MongoDB in production environment');
  }
  
  // Check for proper CORS settings in production
  if (!process.env.FRONTEND_URL) {
    console.log('\n⚠️ WARNING: FRONTEND_URL not set in production, CORS will allow all origins');
    warnings.push('FRONTEND_URL not set in production, CORS will allow all origins');
  }
}

// Summary
console.log('\n=== VERIFICATION SUMMARY ===\n');

if (missingRequired) {
  console.log('❌ CRITICAL ISSUES FOUND: Some required environment variables are missing.');
  console.log('   Please fix these issues before running the application.');
  process.exit(1);
} else if (warnings.length > 0) {
  console.log('⚠️ WARNINGS FOUND:');
  warnings.forEach((warning, index) => {
    console.log(`   ${index + 1}. ${warning}`);
  });
  console.log('\nThe application may run, but these issues should be addressed.');
} else {
  console.log('✅ ALL CHECKS PASSED: Environment is properly configured.');
}

console.log('\n============================\n'); 