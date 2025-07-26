const User = require('../models/User');
const Holiday = require('../models/Holiday');
const Config = require('../models/Config');
const Leave = require('../models/Leave');

// Get leave quotas
const getQuotas = async (req, res) => {
    try {
        const config = await Config.getConfig();
        
        res.json({
            success: true,
            quotas: config.leaveQuotas
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching quotas: ' + error.message
        });
    }
};

// Update leave quotas
const updateQuotas = async (req, res) => {
    try {
        const { regular, intern } = req.body;
        const config = await Config.getConfig();

        if (regular) {
            config.leaveQuotas.regular = { ...config.leaveQuotas.regular, ...regular };
        }
        if (intern) {
            config.leaveQuotas.intern = { ...config.leaveQuotas.intern, ...intern };
        }

        await config.save();

        res.json({
            success: true,
            message: 'Leave quotas updated successfully',
            quotas: config.leaveQuotas
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating quotas: ' + error.message
        });
    }
};

// Get all holidays
const getHolidaysList = async (req, res) => {
    try {
        const year = req.query.year || new Date().getFullYear();
        const holidays = await Holiday.getHolidaysForYear(year);
        
        res.json({
            success: true,
            holidays
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching holidays: ' + error.message
        });
    }
};

// Add holiday
const addHoliday = async (req, res) => {
    try {
        const { date, name, type } = req.body;

        if (!date || !name) {
            return res.status(400).json({
                success: false,
                message: 'Date and name are required'
            });
        }

        const holidayDate = new Date(date);
        const year = holidayDate.getFullYear();

        const holiday = new Holiday({
            date: holidayDate,
            name,
            year,
            type: type || 'national'
        });

        await holiday.save();
        
        res.json({
            success: true,
            message: 'Holiday added successfully',
            holiday
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Holiday already exists for this date'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error adding holiday: ' + error.message
        });
    }
};

// Delete holiday
const deleteHoliday = async (req, res) => {
    try {
        const { holidayId } = req.params;

        const holiday = await Holiday.findByIdAndDelete(holidayId);
        
        if (!holiday) {
            return res.status(404).json({
                success: false,
                message: 'Holiday not found'
            });
        }

        res.json({
            success: true,
            message: 'Holiday deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting holiday: ' + error.message
        });
    }
};

// Get all users
const getUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select('-password')
            .populate('managerId', 'name email')
            .sort('name');
        
        res.json({
            success: true,
            users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching users: ' + error.message
        });
    }
};

// Add user
const addUser = async (req, res) => {
    try {
        const { name, email, password, role, type, department, joiningDate, managerId } = req.body;

        if (!name || !email || !password || !role || !type) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, password, role, and type are required'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        const newUser = new User({
            name,
            email,
            password,
            role,
            type,
            department: department || 'General',
            joiningDate: joiningDate || new Date(),
            managerId
        });

        // Initialize leave balance
        newUser.initializeLeaveBalance();
        await newUser.save();

        res.json({
            success: true,
            message: 'User added successfully',
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                type: newUser.type,
                department: newUser.department,
                leaveBalance: newUser.leaveBalance
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error adding user: ' + error.message
        });
    }
};

// Update user
const updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const updates = req.body;

        // Don't allow password update through this endpoint
        delete updates.password;

        const user = await User.findByIdAndUpdate(
            userId,
            updates,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User updated successfully',
            user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating user: ' + error.message
        });
    }
};

// Deactivate/Activate user
const toggleUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.isActive = !user.isActive;
        await user.save();

        res.json({
            success: true,
            message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
            isActive: user.isActive
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating user status: ' + error.message
        });
    }
};

// Get system settings
const getSettings = async (req, res) => {
    try {
        const config = await Config.getConfig();
        
        res.json({
            success: true,
            settings: config.systemSettings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching settings: ' + error.message
        });
    }
};

// Update system settings
const updateSettings = async (req, res) => {
    try {
        const config = await Config.getConfig();
        
        // Update only provided settings
        Object.keys(req.body).forEach(key => {
            if (config.systemSettings[key] !== undefined) {
                config.systemSettings[key] = req.body[key];
            }
        });

        await config.save();
        
        res.json({
            success: true,
            message: 'Settings updated successfully',
            settings: config.systemSettings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating settings: ' + error.message
        });
    }
};

// Get accrual information
const getAccrualInfo = async (req, res) => {
    try {
        const config = await Config.getConfig();
        
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1);
        
        res.json({
            success: true,
            lastRun: config.lastAccrualRun,
            nextRun: nextMonth.toISOString().split('T')[0],
            mode: 'Manual',
            rates: config.accrualRates,
            history: config.accrualHistory.slice(-10) // Last 10 entries
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching accrual info: ' + error.message
        });
    }
};

// Run monthly accrual
const runMonthlyAccrual = async (req, res) => {
    try {
        const config = await Config.getConfig();
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        let processed = 0;
        let totalCredited = 0;
        
        // Get all active users
        const users = await User.find({ isActive: true });
        
        for (const user of users) {
            // Skip if user joined this month
            const joiningDate = new Date(user.joiningDate);
            if (joiningDate.getFullYear() === currentYear && joiningDate.getMonth() === currentMonth) {
                continue;
            }
            
            const rates = config.accrualRates[user.type];
            const previousBalance = { ...user.leaveBalance };
            
            // Apply carry forward logic first (at year start)
            if (currentMonth === 0) { // January
                const totalLeaves = user.leaveBalance.sick + user.leaveBalance.casual + user.leaveBalance.vacation;
                const carryForward = Math.min(totalLeaves, config.systemSettings.carryForwardCap);
                
                // Reset balances and apply carry forward
                user.leaveBalance.sick = carryForward * 0.4; // Proportional distribution
                user.leaveBalance.casual = carryForward * 0.3;
                user.leaveBalance.vacation = carryForward * 0.3;
                user.carryForward = carryForward;
            }
            
            // Credit monthly leaves
            user.leaveBalance.sick += rates.sick;
            user.leaveBalance.casual += rates.casual;
            if (user.type === 'regular') {
                user.leaveBalance.vacation += rates.vacation || 0;
            }
            
            // Round to 1 decimal place
            user.leaveBalance.sick = Math.round(user.leaveBalance.sick * 10) / 10;
            user.leaveBalance.casual = Math.round(user.leaveBalance.casual * 10) / 10;
            user.leaveBalance.vacation = Math.round(user.leaveBalance.vacation * 10) / 10;
            
            // Check for negative balance and convert to LOP
            ['sick', 'casual', 'vacation'].forEach(type => {
                if (user.leaveBalance[type] < 0) {
                    user.leaveBalance.lop += Math.abs(user.leaveBalance[type]);
                    user.leaveBalance[type] = 0;
                }
            });
            
            // Cap annual quotas
            const quotas = config.leaveQuotas[user.type];
            if (user.leaveBalance.sick > quotas.sick) user.leaveBalance.sick = quotas.sick;
            if (user.leaveBalance.casual > quotas.casual) user.leaveBalance.casual = quotas.casual;
            if (user.leaveBalance.vacation > quotas.vacation) user.leaveBalance.vacation = quotas.vacation;
            
            await user.save();
            
            processed++;
            totalCredited += (user.leaveBalance.sick - previousBalance.sick) + 
                           (user.leaveBalance.casual - previousBalance.casual) + 
                           (user.leaveBalance.vacation - previousBalance.vacation);
        }
        
        // Log the accrual run
        config.accrualHistory.push({
            date: today,
            type: 'Monthly Accrual',
            employeesProcessed: processed,
            totalCredited: Math.round(totalCredited * 10) / 10,
            status: 'Completed'
        });
        
        config.lastAccrualRun = today;
        await config.save();
        
        res.json({
            success: true,
            message: 'Monthly accrual completed successfully',
            processed,
            totalCredited: Math.round(totalCredited * 10) / 10
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error running accrual: ' + error.message
        });
    }
};

// Update accrual rates
const updateAccrualRates = async (req, res) => {
    try {
        const { regular, intern } = req.body;
        const config = await Config.getConfig();

        if (regular) {
            config.accrualRates.regular = { ...config.accrualRates.regular, ...regular };
        }
        if (intern) {
            config.accrualRates.intern = { ...config.accrualRates.intern, ...intern };
        }

        await config.save();
        
        res.json({
            success: true,
            message: 'Accrual rates updated successfully',
            rates: config.accrualRates
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating accrual rates: ' + error.message
        });
    }
};

// Get leave statistics
const getLeaveStats = async (req, res) => {
    try {
        const { year = new Date().getFullYear() } = req.query;
        
        // Get leave statistics
        const stats = await Leave.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(`${year}-01-01`),
                        $lt: new Date(`${year + 1}-01-01`)
                    }
                }
            },
            {
                $group: {
                    _id: {
                        status: '$status',
                        leaveType: '$leaveType'
                    },
                    count: { $sum: 1 },
                    totalDays: { $sum: '$workingDays' }
                }
            }
        ]);

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching statistics: ' + error.message
        });
    }
};

module.exports = {
    getQuotas,
    updateQuotas,
    getHolidaysList,
    addHoliday,
    deleteHoliday,
    getUsers,
    addUser,
    updateUser,
    toggleUserStatus,
    getSettings,
    updateSettings,
    getAccrualInfo,
    runMonthlyAccrual,
    updateAccrualRates,
    getLeaveStats
}; 