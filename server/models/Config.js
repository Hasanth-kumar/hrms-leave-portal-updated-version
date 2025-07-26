const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        default: 'system_config'
    },
    leaveQuotas: {
        regular: {
            sick: {
                type: Number,
                default: 12
            },
            casual: {
                type: Number,
                default: 8
            },
            vacation: {
                type: Number,
                default: 20
            },
            academic: {
                type: Number,
                default: 15 // Annual academic leave quota
            }
        },
        intern: {
            sick: {
                type: Number,
                default: 6
            },
            casual: {
                type: Number,
                default: 6
            },
            vacation: {
                type: Number,
                default: 0
            },
            academic: {
                type: Number,
                default: 10 // Reduced quota for interns
            }
        }
    },
    accrualRates: {
        regular: {
            sick: {
                type: Number,
                default: 1
            },
            casual: {
                type: Number,
                default: 0.67
            },
            vacation: {
                type: Number,
                default: 1.67
            },
            academic: {
                type: Number,
                default: 1.25 // Monthly accrual for academic leave
            }
        },
        intern: {
            sick: {
                type: Number,
                default: 0.5
            },
            casual: {
                type: Number,
                default: 0.5
            },
            vacation: {
                type: Number,
                default: 0
            },
            academic: {
                type: Number,
                default: 0.83 // Monthly accrual for academic leave
            }
        }
    },
    systemSettings: {
        maxLOPDays: {
            type: Number,
            default: 10 // Maximum LOP days allowed per year
        },
        maxLOPDaysPerMonth: {
            type: Number,
            default: 5 // Maximum LOP days allowed per month
        },
        carryForwardCap: {
            type: Number,
            default: 15
        },
        advanceNotice: {
            casual: {
                type: Number,
                default: 7
            },
            vacation: {
                type: Number,
                default: 7
            },
            academic: {
                type: Number,
                default: 14 // Academic leave requires 14 days advance notice
            }
        },
        sickLeaveCutoffTime: {
            type: String,
            default: '11:00'
        },
        hrEmail: {
            type: String,
            default: 'leaves@domain.com'
        },
        workingDays: {
            type: [Number],
            default: [1, 2, 3, 4, 5] // Monday to Friday
        },
        lopSettings: {
            autoConvertNegativeBalance: {
                type: Boolean,
                default: true // Automatically convert negative leave balance to LOP
            },
            lopResetPeriod: {
                type: String,
                enum: ['monthly', 'yearly'],
                default: 'yearly' // When to reset LOP counter
            },
            allowLOPCarryForward: {
                type: Boolean,
                default: false // Whether to carry forward LOP to next period
            },
            lopAlertThreshold: {
                type: Number,
                default: 5 // Alert when LOP days reach this threshold
            },
            restrictLeaveAfterMaxLOP: {
                type: Boolean,
                default: true // Restrict new leave applications after max LOP reached
            },
            lopDeductionFromSalary: {
                type: Boolean,
                default: true // Whether LOP affects salary
            }
        },
        academicLeaveSettings: {
            requireDocuments: {
                type: Boolean,
                default: true
            },
            maxDocuments: {
                type: Number,
                default: 5
            },
            allowedFileTypes: {
                type: [String],
                default: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']
            },
            maxFileSize: {
                type: Number,
                default: 5242880 // 5MB in bytes
            },
            minAdvanceNotice: {
                type: Number,
                default: 14 // Minimum days in advance
            },
            maxConsecutiveDays: {
                type: Number,
                default: 30 // Maximum consecutive academic leave days
            },
            requireManagerApproval: {
                type: Boolean,
                default: true
            },
            requireHRApproval: {
                type: Boolean,
                default: true // Academic leave requires HR approval too
            }
        }
    },
    lastAccrualRun: {
        type: Date
    },
    accrualHistory: [{
        date: {
            type: Date,
            default: Date.now
        },
        type: String,
        employeesProcessed: Number,
        totalCredited: Number,
        status: String
    }]
}, {
    timestamps: true
});

// Static method to get or create config
configSchema.statics.getConfig = async function() {
    let config = await this.findOne({ name: 'system_config' });
    
    if (!config) {
        config = await this.create({ name: 'system_config' });
    }
    
    return config;
};

const Config = mongoose.model('Config', configSchema);

module.exports = Config; 