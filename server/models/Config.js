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
            }
        }
    },
    systemSettings: {
        maxLOPDays: {
            type: Number,
            default: 30
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