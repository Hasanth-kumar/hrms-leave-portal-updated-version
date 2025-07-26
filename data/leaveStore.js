// Enhanced in-memory data store for comprehensive leave management
const dataStore = {
    // User data with employee types and leave balances
    users: [],
    
    // Leave applications
    leaves: [],
    
    // Holiday calendar
    holidays: [
        { date: '2024-01-01', name: 'New Year' },
        { date: '2024-01-26', name: 'Republic Day' },
        { date: '2024-03-25', name: 'Holi' },
        { date: '2024-08-15', name: 'Independence Day' },
        { date: '2024-10-02', name: 'Gandhi Jayanti' },
        { date: '2024-11-01', name: 'Diwali' }
    ],
    
    // Leave quotas configuration
    leaveQuotas: {
        regular: {
            sick: 12,      // Annual quota
            casual: 8,     // Annual quota
            vacation: 20   // Annual quota (as per config)
        },
        intern: {
            sick: 6,       // 0.5 per month * 12
            casual: 6      // 0.5 per month * 12
        }
    },
    
    // Leave accrual rates (monthly)
    accrualRates: {
        regular: {
            sick: 1,       // 1 day per month
            casual: 0.67,  // 8 days / 12 months
            vacation: 1.67 // 20 days / 12 months
        },
        intern: {
            sick: 0.5,
            casual: 0.5
        }
    },
    
    // Configuration
    config: {
        maxLOPDays: 30,
        carryForwardCap: 15,
        advanceNotice: {
            casual: 7,    // 1 week in days
            vacation: 7   // 1 week in days
        },
        sickLeaveCutoffTime: '11:00',
        hrEmail: 'leaves@domain.com'
    },
    
    // Accrual tracking
    accrualHistory: [],
    lastAccrualRun: null,
    
    // Counters
    currentUser: null,
    leaveIdCounter: 1,
    userIdCounter: 4
};

// Helper functions
const helpers = {
    // Check if date is weekend
    isWeekend: (date) => {
        const day = new Date(date).getDay();
        return day === 0 || day === 6; // Sunday or Saturday
    },
    
    // Check if date is holiday
    isHoliday: (date) => {
        const dateStr = new Date(date).toISOString().split('T')[0];
        return dataStore.holidays.some(h => h.date === dateStr);
    },
    
    // Calculate working days between dates
    calculateWorkingDays: (startDate, endDate) => {
        let count = 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            if (!helpers.isWeekend(d) && !helpers.isHoliday(d)) {
                count++;
            }
        }
        return count;
    },
    
    // Calculate days difference
    daysDifference: (date1, date2) => {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
    },
    
    // Check if leaves overlap
    checkOverlap: (userId, startDate, endDate, excludeLeaveId = null) => {
        return dataStore.leaves.some(leave => {
            if (leave.userId !== userId || leave.id === excludeLeaveId) return false;
            if (leave.status === 'rejected' || leave.status === 'cancelled') return false;
            
            const leaveStart = new Date(leave.startDate);
            const leaveEnd = new Date(leave.endDate);
            const newStart = new Date(startDate);
            const newEnd = new Date(endDate);
            
            return (newStart <= leaveEnd && newEnd >= leaveStart);
        });
    }
};

// Leave operations
const leaveStore = {
    // Initialize default users with leave balances
    initializeUsers: () => {
        dataStore.users = [
            { 
                id: 1, 
                name: 'John Doe', 
                email: 'john@company.com',
                role: 'employee', 
                type: 'regular',
                joiningDate: '2023-01-15',
                leaveBalance: {
                    sick: 12,
                    casual: 8,
                    vacation: 20,
                    compOff: 0,
                    lop: 0
                },
                carryForward: 0
            },
            { 
                id: 2, 
                name: 'Jane Smith', 
                email: 'jane@company.com',
                role: 'manager', 
                type: 'regular',
                joiningDate: '2022-06-01',
                leaveBalance: {
                    sick: 12,
                    casual: 8,
                    vacation: 20,
                    compOff: 0,
                    lop: 0
                },
                carryForward: 0
            },
            { 
                id: 3, 
                name: 'Admin User', 
                email: 'admin@company.com',
                role: 'admin', 
                type: 'regular',
                joiningDate: '2021-03-10',
                leaveBalance: {
                    sick: 12,
                    casual: 8,
                    vacation: 20,
                    compOff: 0,
                    lop: 0
                },
                carryForward: 0
            },
            {
                id: 4,
                name: 'Intern User',
                email: 'intern@company.com',
                role: 'employee',
                type: 'intern',
                joiningDate: '2024-01-01',
                leaveBalance: {
                    sick: 3,    // 6 months * 0.5
                    casual: 3,
                    vacation: 0,
                    compOff: 0,
                    lop: 0
                },
                carryForward: 0
            }
        ];
    },
    
    // Get all leaves
    getAllLeaves: () => {
        return dataStore.leaves;
    },
    
    // Get leaves by user ID
    getLeavesByUserId: (userId) => {
        return dataStore.leaves.filter(leave => leave.userId === userId);
    },
    
    // Get pending leaves
    getPendingLeaves: () => {
        return dataStore.leaves.filter(leave => leave.status === 'pending');
    },
    
    // Get user by ID
    getUserById: (userId) => {
        return dataStore.users.find(u => u.id === userId);
    },
    
    // Create a new leave request with validations
    createLeave: (leaveData) => {
        const user = dataStore.users.find(u => u.id === leaveData.userId);
        if (!user) throw new Error('User not found');
        
        // Validation checks
        const validationResult = leaveStore.validateLeaveRequest(user, leaveData);
        if (!validationResult.valid) {
            throw new Error(validationResult.message);
        }
        
        // Calculate working days
        const workingDays = helpers.calculateWorkingDays(leaveData.startDate, leaveData.endDate);
        
        // Check leave balance (except for LOP and WFH)
        if (!['lop', 'wfh'].includes(leaveData.leaveType)) {
            const availableBalance = user.leaveBalance[leaveData.leaveType] || 0;
            if (workingDays > availableBalance && leaveData.leaveType !== 'compOff') {
                // Convert excess to LOP
                const excessDays = workingDays - availableBalance;
                if ((user.leaveBalance.lop + excessDays) > dataStore.config.maxLOPDays) {
                    throw new Error(`Maximum LOP days (${dataStore.config.maxLOPDays}) would be exceeded`);
                }
            }
        }
        
        const newLeave = {
            id: dataStore.leaveIdCounter++,
            userId: leaveData.userId,
            userName: user.name,
            userEmail: user.email,
            startDate: leaveData.startDate,
            endDate: leaveData.endDate,
            leaveType: leaveData.leaveType,
            reason: leaveData.reason,
            status: 'pending',
            workingDays: workingDays,
            appliedOn: new Date().toISOString(),
            approvedBy: null,
            approvedOn: null,
            documents: leaveData.documents || [],
            isHalfDay: leaveData.isHalfDay || false
        };
        
        dataStore.leaves.push(newLeave);
        return newLeave;
    },
    
    // Validate leave request
    validateLeaveRequest: (user, leaveData) => {
        // Check for overlapping leaves
        if (helpers.checkOverlap(user.id, leaveData.startDate, leaveData.endDate)) {
            return { valid: false, message: 'Leave dates overlap with existing leave request' };
        }
        
        // Check if applying on weekend or holiday
        if (leaveData.leaveType !== 'wfh') {
            const startDate = new Date(leaveData.startDate);
            const endDate = new Date(leaveData.endDate);
            
            if (helpers.isWeekend(startDate) || helpers.isHoliday(startDate)) {
                return { valid: false, message: 'Cannot apply leave starting on weekend or holiday' };
            }
        }
        
        // Check advance notice for casual and vacation leave
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const requestDate = new Date(leaveData.startDate);
        const daysDiff = helpers.daysDifference(today, requestDate);
        
        if (leaveData.leaveType === 'casual' || leaveData.leaveType === 'vacation') {
            if (daysDiff < dataStore.config.advanceNotice[leaveData.leaveType]) {
                return { 
                    valid: false, 
                    message: `${leaveData.leaveType} leave must be applied ${dataStore.config.advanceNotice[leaveData.leaveType]} days in advance` 
                };
            }
        }
        
        // Check sick leave same-day cutoff
        if (leaveData.leaveType === 'sick' && daysDiff === 0) {
            const now = new Date();
            const [cutoffHour, cutoffMinute] = dataStore.config.sickLeaveCutoffTime.split(':');
            const cutoff = new Date();
            cutoff.setHours(parseInt(cutoffHour), parseInt(cutoffMinute), 0, 0);
            
            if (now > cutoff) {
                return { 
                    valid: false, 
                    message: `Same-day sick leave must be applied before ${dataStore.config.sickLeaveCutoffTime}` 
                };
            }
        }
        
        // Academic leave must have documents
        if (leaveData.leaveType === 'academic' && (!leaveData.documents || leaveData.documents.length === 0)) {
            return { valid: false, message: 'Academic leave requires supporting documents' };
        }
        
        return { valid: true };
    },
    
    // Update leave status
    updateLeaveStatus: (leaveId, status, approvedBy) => {
        const leave = dataStore.leaves.find(l => l.id === parseInt(leaveId));
        if (!leave) return null;
        
        const previousStatus = leave.status;
        leave.status = status;
        leave.approvedBy = approvedBy;
        leave.approvedOn = new Date().toISOString();
        
        // Update leave balance if approved
        if (status === 'approved' && previousStatus === 'pending') {
            const user = dataStore.users.find(u => u.id === leave.userId);
            if (user && leave.leaveType !== 'wfh') {
                const leaveTypeBalance = user.leaveBalance[leave.leaveType] || 0;
                
                if (leave.workingDays > leaveTypeBalance) {
                    // Partial deduction and LOP
                    const lopDays = leave.workingDays - leaveTypeBalance;
                    user.leaveBalance[leave.leaveType] = 0;
                    user.leaveBalance.lop += lopDays;
                } else {
                    // Full deduction from leave balance
                    user.leaveBalance[leave.leaveType] -= leave.workingDays;
                }
            }
        }
        
        return leave;
    },
    
    // Cancel leave
    cancelLeave: (leaveId, userId) => {
        const leave = dataStore.leaves.find(l => l.id === parseInt(leaveId));
        if (!leave) return null;
        
        // Check if user can cancel (only their own leave and before start date)
        if (leave.userId !== userId) {
            throw new Error('You can only cancel your own leave requests');
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDate = new Date(leave.startDate);
        
        if (today >= startDate) {
            throw new Error('Cannot cancel leave after start date');
        }
        
        // If approved, restore leave balance
        if (leave.status === 'approved') {
            const user = dataStore.users.find(u => u.id === leave.userId);
            if (user && leave.leaveType !== 'wfh') {
                // Restore the deducted leave balance
                if (leave.workingDays <= user.leaveBalance.lop) {
                    user.leaveBalance.lop -= leave.workingDays;
                } else {
                    const fromBalance = leave.workingDays - user.leaveBalance.lop;
                    user.leaveBalance.lop = 0;
                    user.leaveBalance[leave.leaveType] += fromBalance;
                }
            }
        }
        
        leave.status = 'cancelled';
        leave.cancelledOn = new Date().toISOString();
        
        return leave;
    },
    
    // Add comp off
    addCompOff: (userId, days, reason) => {
        const user = dataStore.users.find(u => u.id === userId);
        if (!user) return null;
        
        user.leaveBalance.compOff += days;
        
        // Log comp off addition
        dataStore.leaves.push({
            id: dataStore.leaveIdCounter++,
            userId: userId,
            userName: user.name,
            userEmail: user.email,
            leaveType: 'compOff_credit',
            days: days,
            reason: reason,
            status: 'approved',
            appliedOn: new Date().toISOString()
        });
        
        return user.leaveBalance;
    },
    
    // Mark WFH
    markWFH: (userId, date, reason) => {
        const user = dataStore.users.find(u => u.id === userId);
        if (!user) return null;
        
        // Check if date is not weekend or holiday
        if (helpers.isWeekend(date) || helpers.isHoliday(date)) {
            throw new Error('Cannot mark WFH on weekends or holidays');
        }
        
        // Check for existing leave on this date
        if (helpers.checkOverlap(userId, date, date)) {
            throw new Error('Leave already exists for this date');
        }
        
        return leaveStore.createLeave({
            userId: userId,
            startDate: date,
            endDate: date,
            leaveType: 'wfh',
            reason: reason
        });
    },
    
    // Get leave balance
    getLeaveBalance: (userId) => {
        const user = dataStore.users.find(u => u.id === userId);
        return user ? user.leaveBalance : null;
    },
    
    // Get holidays
    getHolidays: () => {
        return dataStore.holidays;
    },
    
    // Admin functions
    updateLeaveQuotas: (type, quotas) => {
        dataStore.leaveQuotas[type] = { ...dataStore.leaveQuotas[type], ...quotas };
    },
    
    addHoliday: (date, name) => {
        dataStore.holidays.push({ date, name });
        dataStore.holidays.sort((a, b) => new Date(a.date) - new Date(b.date));
    },
    
    removeHoliday: (date) => {
        dataStore.holidays = dataStore.holidays.filter(h => h.date !== date);
    },
    
    // User operations
    setCurrentUser: (user) => {
        dataStore.currentUser = user;
    },
    
    getCurrentUser: () => {
        return dataStore.currentUser;
    },
    
    // Login with email
    loginUser: (name, role) => {
        let user = dataStore.users.find(u => u.name === name && u.role === role);
        
        if (!user) {
            // Create new user
            user = {
                id: ++dataStore.userIdCounter,
                name: name,
                email: `${name.toLowerCase().replace(' ', '.')}@company.com`,
                role: role,
                type: role === 'intern' ? 'intern' : 'regular',
                joiningDate: new Date().toISOString().split('T')[0],
                leaveBalance: {
                    sick: role === 'intern' ? 0 : 12,
                    casual: role === 'intern' ? 0 : 8,
                    vacation: role === 'intern' ? 0 : 20,
                    compOff: 0,
                    lop: 0
                },
                carryForward: 0
            };
            dataStore.users.push(user);
        }
        
        dataStore.currentUser = user;
        return user;
    },
    
    // Clear all data (for testing)
    clearAll: () => {
        dataStore.leaves = [];
        dataStore.currentUser = null;
        dataStore.leaveIdCounter = 1;
        leaveStore.initializeUsers();
    },
    
    // Admin functions
    getLeaveQuotas: () => {
        return dataStore.leaveQuotas;
    },
    
    getAllUsers: () => {
        return dataStore.users;
    },
    
    addUser: (userData) => {
        const { name, email, role, type, joiningDate } = userData;
        
        // Check if user already exists
        if (dataStore.users.find(u => u.email === email)) {
            throw new Error('User with this email already exists');
        }
        
        const newUser = {
            id: ++dataStore.userIdCounter,
            name,
            email,
            role,
            type,
            joiningDate: joiningDate || new Date().toISOString().split('T')[0],
            leaveBalance: {
                sick: 0,
                casual: 0,
                vacation: 0,
                compOff: 0,
                lop: 0
            },
            carryForward: 0
        };
        
        // Calculate prorated leave balance based on joining date
        const joiningMonth = new Date(newUser.joiningDate).getMonth();
        const currentMonth = new Date().getMonth();
        const monthsWorked = currentMonth - joiningMonth + 1;
        
        if (monthsWorked > 0) {
            const rates = dataStore.accrualRates[type];
            newUser.leaveBalance.sick = Math.round(rates.sick * monthsWorked * 10) / 10;
            newUser.leaveBalance.casual = Math.round(rates.casual * monthsWorked * 10) / 10;
            if (type === 'regular') {
                newUser.leaveBalance.vacation = Math.round(rates.vacation * monthsWorked * 10) / 10;
            }
        }
        
        dataStore.users.push(newUser);
        return newUser;
    },
    
    deleteUser: (userId) => {
        const index = dataStore.users.findIndex(u => u.id === userId);
        if (index === -1) {
            throw new Error('User not found');
        }
        dataStore.users.splice(index, 1);
    },
    
    getSystemSettings: () => {
        return dataStore.config;
    },
    
    updateSystemSettings: (settings) => {
        dataStore.config = { ...dataStore.config, ...settings };
    },
    
    updateAccrualRates: (rates) => {
        if (rates.regular) {
            dataStore.accrualRates.regular = { ...dataStore.accrualRates.regular, ...rates.regular };
        }
        if (rates.intern) {
            dataStore.accrualRates.intern = { ...dataStore.accrualRates.intern, ...rates.intern };
        }
    },
    
    getAccrualInfo: () => {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1);
        
        return {
            lastRun: dataStore.lastAccrualRun,
            nextRun: nextMonth.toISOString().split('T')[0],
            mode: 'Manual',
            rates: dataStore.accrualRates,
            log: dataStore.accrualHistory.slice(-10) // Last 10 entries
        };
    },
    
    // Monthly accrual system
    runMonthlyAccrual: () => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        let processed = 0;
        let totalCredited = 0;
        
        dataStore.users.forEach(user => {
            // Skip if user joined this month
            const joiningDate = new Date(user.joiningDate);
            if (joiningDate.getFullYear() === currentYear && joiningDate.getMonth() === currentMonth) {
                return;
            }
            
            const rates = dataStore.accrualRates[user.type];
            const previousBalance = { ...user.leaveBalance };
            
            // Apply carry forward logic first (at year start)
            if (currentMonth === 0) { // January
                const totalLeaves = user.leaveBalance.sick + user.leaveBalance.casual + user.leaveBalance.vacation;
                const carryForward = Math.min(totalLeaves, dataStore.config.carryForwardCap);
                
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
            const quotas = dataStore.leaveQuotas[user.type];
            if (user.leaveBalance.sick > quotas.sick) user.leaveBalance.sick = quotas.sick;
            if (user.leaveBalance.casual > quotas.casual) user.leaveBalance.casual = quotas.casual;
            if (user.leaveBalance.vacation > quotas.vacation) user.leaveBalance.vacation = quotas.vacation;
            
            processed++;
            totalCredited += (user.leaveBalance.sick - previousBalance.sick) + 
                           (user.leaveBalance.casual - previousBalance.casual) + 
                           (user.leaveBalance.vacation - previousBalance.vacation);
        });
        
        // Log the accrual run
        const accrualLog = {
            date: today.toISOString(),
            type: 'Monthly Accrual',
            employeesProcessed: processed,
            totalCredited: Math.round(totalCredited * 10) / 10,
            status: 'Completed'
        };
        
        dataStore.accrualHistory.push(accrualLog);
        dataStore.lastAccrualRun = today.toISOString();
        
        return {
            processed,
            totalCredited: Math.round(totalCredited * 10) / 10
        };
    },
    
    // Process carry forward (called at year end)
    processCarryForward: () => {
        let processed = 0;
        
        dataStore.users.forEach(user => {
            const totalBalance = user.leaveBalance.sick + user.leaveBalance.casual + user.leaveBalance.vacation;
            const carryForward = Math.min(totalBalance, dataStore.config.carryForwardCap);
            
            user.carryForward = carryForward;
            processed++;
        });
        
        return { processed, message: 'Carry forward calculated for all users' };
    }
};

// Initialize users on module load
leaveStore.initializeUsers();

module.exports = leaveStore; 