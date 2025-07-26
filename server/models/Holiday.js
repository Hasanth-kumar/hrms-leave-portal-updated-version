const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    name: {
        type: String,
        required: [true, 'Holiday name is required'],
        trim: true
    },
    year: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        enum: ['national', 'regional', 'optional'],
        default: 'national'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Create compound index for unique holiday per date
holidaySchema.index({ date: 1, year: 1 }, { unique: true });

// Static method to get holidays for a year
holidaySchema.statics.getHolidaysForYear = async function(year) {
    return await this.find({ year, isActive: true }).sort('date');
};

// Static method to check if a date is a holiday
holidaySchema.statics.isHoliday = async function(date) {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    const holiday = await this.findOne({
        date: checkDate,
        year: checkDate.getFullYear(),
        isActive: true
    });
    
    return !!holiday;
};

const Holiday = mongoose.model('Holiday', holidaySchema);

module.exports = Holiday; 