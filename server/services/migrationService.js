const User = require('../models/User');
const Holiday = require('../models/Holiday');
const Config = require('../models/Config');
const bcrypt = require('bcryptjs');

// Seed initial users
const seedUsers = async () => {
    try {
        // Check if users already exist
        const userCount = await User.countDocuments();
        if (userCount > 0) {
            console.log('Users already exist, skipping seed');
            return;
        }

        // Default password for all seeded users
        const defaultPassword = 'password123';

        const users = [
            {
                name: 'John Doe',
                email: 'john@company.com',
                password: defaultPassword,
                role: 'employee',
                type: 'regular',
                joiningDate: new Date('2023-01-15'),
                department: 'Engineering'
            },
            {
                name: 'Jane Smith',
                email: 'jane@company.com',
                password: defaultPassword,
                role: 'manager',
                type: 'regular',
                joiningDate: new Date('2022-06-01'),
                department: 'Engineering'
            },
            {
                name: 'Admin User',
                email: 'admin@company.com',
                password: defaultPassword,
                role: 'admin',
                type: 'regular',
                joiningDate: new Date('2021-03-10'),
                department: 'HR'
            },
            {
                name: 'Intern User',
                email: 'intern@company.com',
                password: defaultPassword,
                role: 'employee',
                type: 'intern',
                joiningDate: new Date('2024-01-01'),
                department: 'Engineering'
            }
        ];

        // Create users and initialize their leave balances
        for (const userData of users) {
            const user = new User(userData);
            user.initializeLeaveBalance();
            await user.save();
            console.log(`Created user: ${user.name} (${user.email})`);
        }

        console.log('Initial users seeded successfully');
        console.log('Default password for all users: password123');
    } catch (error) {
        console.error('Error seeding users:', error);
    }
};

// Seed holidays for current year
const seedHolidays = async () => {
    try {
        const currentYear = new Date().getFullYear();
        
        // Check if holidays already exist for current year
        const holidayCount = await Holiday.countDocuments({ year: currentYear });
        if (holidayCount > 0) {
            console.log('Holidays already exist for current year, skipping seed');
            return;
        }

        const holidays = [
            { date: new Date(`${currentYear}-01-01`), name: 'New Year', year: currentYear },
            { date: new Date(`${currentYear}-01-26`), name: 'Republic Day', year: currentYear },
            { date: new Date(`${currentYear}-03-25`), name: 'Holi', year: currentYear },
            { date: new Date(`${currentYear}-08-15`), name: 'Independence Day', year: currentYear },
            { date: new Date(`${currentYear}-10-02`), name: 'Gandhi Jayanti', year: currentYear },
            { date: new Date(`${currentYear}-11-01`), name: 'Diwali', year: currentYear },
            { date: new Date(`${currentYear}-12-25`), name: 'Christmas', year: currentYear }
        ];

        await Holiday.insertMany(holidays);
        console.log(`Seeded ${holidays.length} holidays for year ${currentYear}`);
    } catch (error) {
        console.error('Error seeding holidays:', error);
    }
};

// Initialize system configuration
const initializeConfig = async () => {
    try {
        const config = await Config.getConfig();
        console.log('System configuration initialized');
        return config;
    } catch (error) {
        console.error('Error initializing config:', error);
    }
};

// Run all migrations
const runMigrations = async () => {
    console.log('Starting database migrations...');
    
    await seedUsers();
    await seedHolidays();
    await initializeConfig();
    
    console.log('Database migrations completed');
};

// Export individual functions and the main migration
module.exports = {
    seedUsers,
    seedHolidays,
    initializeConfig,
    runMigrations
}; 