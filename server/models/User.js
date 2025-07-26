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