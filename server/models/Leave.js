const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    leaveType: {
        type: String,
        enum: ['sick', 'casual', 'vacation', 'compOff', 'lop', 'wfh', 'academic'],
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true,
        validate: {
            validator: function(value) {
                return value >= this.startDate;
            },
            message: 'End date must be after or equal to start date'
        }
    },
    reason: {
        type: String,
        required: [true, 'Reason is required'],
        trim: true,
        minlength: [10, 'Reason must be at least 10 characters long']
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
        default: 'pending'
    },
    workingDays: {
        type: Number,
        required: true,
        min: 0
    },
    isHalfDay: {
        type: Boolean,
        default: false
    },
    documents: [{
        fileName: String,
        fileUrl: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedOn: {
        type: Date
    },
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectedOn: {
        type: Date
    },
    rejectionReason: {
        type: String,
        trim: true
    },
    cancelledOn: {
        type: Date
    },
    cancellationReason: {
        type: String,
        trim: true
    },
    // For comp off credits
    compOffDays: {
        type: Number,
        default: 0
    },
    // Track if leave balance was deducted
    balanceDeducted: {
        type: Boolean,
        default: false
    },
    // For tracking LOP conversion
    lopDays: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes for better query performance
leaveSchema.index({ userId: 1, status: 1 });
leaveSchema.index({ startDate: 1, endDate: 1 });
leaveSchema.index({ status: 1, createdAt: -1 });

// Virtual to get user details
leaveSchema.virtual('user', {
    ref: 'User',
    localField: 'userId',
    foreignField: '_id',
    justOne: true
});

// Virtual to get approver details
leaveSchema.virtual('approver', {
    ref: 'User',
    localField: 'approvedBy',
    foreignField: '_id',
    justOne: true
});

// Method to check if leave can be cancelled
leaveSchema.methods.canBeCancelled = function() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(this.startDate);
    startDate.setHours(0, 0, 0, 0);
    
    return this.status !== 'cancelled' && today < startDate;
};

// Pre-save middleware to validate dates
leaveSchema.pre('save', function(next) {
    // Ensure dates are set to beginning of day for consistency
    this.startDate.setHours(0, 0, 0, 0);
    this.endDate.setHours(23, 59, 59, 999);
    
    next();
});

const Leave = mongoose.model('Leave', leaveSchema);

module.exports = Leave; 