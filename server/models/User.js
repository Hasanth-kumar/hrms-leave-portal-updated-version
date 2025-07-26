const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6
    },
    role: {
        type: String,
        enum: ['employee', 'manager', 'admin'],
        default: 'employee'
    },
    type: {
        type: String,
        enum: ['regular', 'intern'],
        default: 'regular'
    },
    joiningDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    leaveBalance: {
        sick: {
            type: Number,
            default: 0,
            min: 0
        },
        casual: {
            type: Number,
            default: 0,
            min: 0
        },
        vacation: {
            type: Number,
            default: 0,
            min: 0
        },
        academic: {
            type: Number,
            default: 0,
            min: 0
        },
        compOff: {
            type: Number,
            default: 0,
            min: 0
        },
        lop: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    lopTracking: {
        yearlyLOP: {
            type: Number,
            default: 0,
            min: 0
        },
        monthlyLOP: {
            type: Number,
            default: 0,
            min: 0
        },
        lastLOPReset: {
            type: Date,
            default: Date.now
        },
        lopHistory: [{
            date: {
                type: Date,
                default: Date.now
            },
            days: {
                type: Number,
                required: true
            },
            reason: {
                type: String,
                required: true
            },
            leaveId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Leave'
            }
        }]
    },
    carryForward: {
        type: Number,
        default: 0,
        min: 0
    },
    department: {
        type: String,
        trim: true
    },
    managerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Initialize leave balance based on type and joining date
userSchema.methods.initializeLeaveBalance = function() {
    const joiningDate = new Date(this.joiningDate);
    const currentDate = new Date();
    const monthsWorked = (currentDate.getFullYear() - joiningDate.getFullYear()) * 12 
                        + (currentDate.getMonth() - joiningDate.getMonth()) + 1;
    
    if (this.type === 'intern') {
        this.leaveBalance.sick = Math.min(monthsWorked * 0.5, 6);
        this.leaveBalance.casual = Math.min(monthsWorked * 0.5, 6);
        this.leaveBalance.vacation = 0;
        this.leaveBalance.academic = Math.min(monthsWorked * 0.83, 10);
    } else {
        // For regular employees, give full quota if joined before current year
        if (joiningDate.getFullYear() < currentDate.getFullYear()) {
            this.leaveBalance.sick = 12;
            this.leaveBalance.casual = 8;
            this.leaveBalance.vacation = 20;
            this.leaveBalance.academic = 15;
        } else {
            // Prorate for current year joiners
            this.leaveBalance.sick = Math.round((monthsWorked / 12) * 12);
            this.leaveBalance.casual = Math.round((monthsWorked / 12) * 8);
            this.leaveBalance.vacation = Math.round((monthsWorked / 12) * 20);
            this.leaveBalance.academic = Math.round((monthsWorked / 12) * 15);
        }
    }
};

// Check if user has exceeded LOP limits
userSchema.methods.checkLOPLimits = async function() {
    const Config = require('./Config');
    const config = await Config.getConfig();
    const lopSettings = config.systemSettings.lopSettings;
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    // Reset LOP counters if needed
    const lastReset = new Date(this.lopTracking.lastLOPReset);
    const needsReset = lopSettings.lopResetPeriod === 'yearly' 
        ? lastReset.getFullYear() < currentYear
        : lastReset.getMonth() < currentMonth || lastReset.getFullYear() < currentYear;
    
    if (needsReset) {
        if (lopSettings.lopResetPeriod === 'yearly') {
            this.lopTracking.yearlyLOP = 0;
            this.lopTracking.monthlyLOP = 0;
        } else {
            this.lopTracking.monthlyLOP = 0;
        }
        this.lopTracking.lastLOPReset = new Date();
    }
    
    return {
        exceedsYearlyLimit: this.lopTracking.yearlyLOP >= config.systemSettings.maxLOPDays,
        exceedsMonthlyLimit: this.lopTracking.monthlyLOP >= config.systemSettings.maxLOPDaysPerMonth,
        nearThreshold: this.lopTracking.yearlyLOP >= lopSettings.lopAlertThreshold,
        yearlyLOP: this.lopTracking.yearlyLOP,
        monthlyLOP: this.lopTracking.monthlyLOP,
        maxYearlyLOP: config.systemSettings.maxLOPDays,
        maxMonthlyLOP: config.systemSettings.maxLOPDaysPerMonth
    };
};

// Add LOP days to user tracking
userSchema.methods.addLOPDays = function(days, reason, leaveId = null) {
    this.lopTracking.yearlyLOP += days;
    this.lopTracking.monthlyLOP += days;
    this.leaveBalance.lop += days;
    
    this.lopTracking.lopHistory.push({
        date: new Date(),
        days: days,
        reason: reason,
        leaveId: leaveId
    });
    
    return this.save();
};

// Convert negative leave balances to LOP
userSchema.methods.convertNegativeBalancesToLOP = async function() {
    const Config = require('./Config');
    const config = await Config.getConfig();
    
    if (!config.systemSettings.lopSettings.autoConvertNegativeBalance) {
        return { converted: false, message: 'Auto-conversion is disabled' };
    }
    
    const leaveTypes = ['sick', 'casual', 'vacation', 'academic'];
    let totalConverted = 0;
    const conversions = [];
    
    for (const type of leaveTypes) {
        if (this.leaveBalance[type] < 0) {
            const negativeAmount = Math.abs(this.leaveBalance[type]);
            totalConverted += negativeAmount;
            
            conversions.push({
                leaveType: type,
                amount: negativeAmount
            });
            
            // Reset the leave balance to 0
            this.leaveBalance[type] = 0;
        }
    }
    
    if (totalConverted > 0) {
        // Check LOP limits before conversion
        const lopStatus = await this.checkLOPLimits();
        
        if (lopStatus.yearlyLOP + totalConverted > lopStatus.maxYearlyLOP) {
            return {
                converted: false,
                message: `Cannot convert ${totalConverted} days to LOP. Would exceed yearly limit of ${lopStatus.maxYearlyLOP} days.`,
                currentLOP: lopStatus.yearlyLOP,
                attemptedConversion: totalConverted
            };
        }
        
        // Add LOP days
        await this.addLOPDays(totalConverted, `Auto-conversion of negative leave balances: ${conversions.map(c => `${c.leaveType}(${c.amount})`).join(', ')}`);
        
        return {
            converted: true,
            totalConverted: totalConverted,
            conversions: conversions,
            newLOPTotal: this.lopTracking.yearlyLOP
        };
    }
    
    return { converted: false, message: 'No negative balances to convert' };
};

// Virtual for full name (can be extended later)
userSchema.virtual('fullName').get(function() {
    return this.name;
});

// Don't return password in JSON responses
userSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.password;
    return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User; 