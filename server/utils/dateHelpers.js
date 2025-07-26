const Holiday = require('../models/Holiday');

// Check if date is weekend
const isWeekend = (date) => {
    const day = new Date(date).getDay();
    return day === 0 || day === 6; // Sunday or Saturday
};

// Check if date is holiday (async because it queries database)
const isHoliday = async (date) => {
    return await Holiday.isHoliday(date);
};

// Calculate working days between dates
const calculateWorkingDays = async (startDate, endDate, isHalfDay = false) => {
    let count = 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Get all holidays in the date range for efficiency
    const year = start.getFullYear();
    const holidays = await Holiday.find({
        year: { $in: [year, year + 1] }, // Handle year boundaries
        isActive: true,
        date: { $gte: start, $lte: end }
    });
    
    const holidayDates = new Set(holidays.map(h => h.date.toDateString()));
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (!isWeekend(d) && !holidayDates.has(d.toDateString())) {
            count++;
        }
    }
    
    // Handle half day
    if (isHalfDay && count > 0) {
        count = count - 0.5;
    }
    
    return count;
};

// Calculate days difference
const daysDifference = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
};

// Check if leaves overlap
const checkOverlap = async (userId, startDate, endDate, excludeLeaveId = null) => {
    const Leave = require('../models/Leave');
    
    const query = {
        userId,
        status: { $nin: ['rejected', 'cancelled'] },
        $or: [
            {
                startDate: { $lte: endDate },
                endDate: { $gte: startDate }
            }
        ]
    };
    
    if (excludeLeaveId) {
        query._id = { $ne: excludeLeaveId };
    }
    
    const overlappingLeave = await Leave.findOne(query);
    return !!overlappingLeave;
};

// Get next working day
const getNextWorkingDay = async (date) => {
    let nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    
    while (isWeekend(nextDay) || await isHoliday(nextDay)) {
        nextDay.setDate(nextDay.getDate() + 1);
    }
    
    return nextDay;
};

// Format date for display
const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

module.exports = {
    isWeekend,
    isHoliday,
    calculateWorkingDays,
    daysDifference,
    checkOverlap,
    getNextWorkingDay,
    formatDate
}; 