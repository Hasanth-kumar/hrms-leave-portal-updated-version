require('dotenv').config();
const connectDB = require('./server/config/database');
const { runMigrations } = require('./server/services/migrationService');
const User = require('./server/models/User');
const Holiday = require('./server/models/Holiday');
const Config = require('./server/models/Config');

async function testDatabase() {
    try {
        console.log('Testing database connection...');
        
        // Connect to database
        await connectDB();
        console.log('✓ Database connected successfully');
        
        // Run migrations
        console.log('\nRunning migrations...');
        await runMigrations();
        console.log('✓ Migrations completed');
        
        // Test queries
        console.log('\nTesting database queries...');
        
        // Count users
        const userCount = await User.countDocuments();
        console.log(`✓ Users in database: ${userCount}`);
        
        // List users
        const users = await User.find().select('name email role');
        console.log('\nUsers:');
        users.forEach(user => {
            console.log(`  - ${user.name} (${user.email}) - ${user.role}`);
        });
        
        // Count holidays
        const holidayCount = await Holiday.countDocuments();
        console.log(`\n✓ Holidays in database: ${holidayCount}`);
        
        // Get config
        const config = await Config.getConfig();
        console.log('\n✓ System configuration loaded');
        console.log(`  - Max LOP Days: ${config.systemSettings.maxLOPDays}`);
        console.log(`  - Carry Forward Cap: ${config.systemSettings.carryForwardCap}`);
        
        console.log('\n✅ All database tests passed!');
        console.log('\nDefault login credentials:');
        console.log('  Email: john@company.com, Password: password123 (Employee)');
        console.log('  Email: jane@company.com, Password: password123 (Manager)');
        console.log('  Email: admin@company.com, Password: password123 (Admin)');
        console.log('  Email: intern@company.com, Password: password123 (Intern)');
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Database test failed:', error.message);
        process.exit(1);
    }
}

testDatabase(); 