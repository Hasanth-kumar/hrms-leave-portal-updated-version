const crypto = require('crypto');

// Generate a secure random string for JWT_SECRET
const generateSecureSecret = () => {
  const secret = crypto.randomBytes(64).toString('hex');
  return secret;
};

// Print the generated secret
console.log('\n=== SECURE JWT SECRET FOR YOUR .ENV FILE ===\n');
console.log(generateSecureSecret());
console.log('\n=== COPY THIS VALUE TO YOUR JWT_SECRET IN .ENV FILE ===\n');
console.log('IMPORTANT: Do not share this key or commit it to version control!\n'); 