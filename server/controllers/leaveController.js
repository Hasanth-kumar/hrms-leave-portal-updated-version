const User = require('../models/User');
const Leave = require('../models/Leave');
const Config = require('../models/Config');
const { 
    calculateWorkingDays, 
    checkOverlap, 
    isWeekend, 
    isHoliday,
    daysDifference 
} = require('../utils/dateHelpers');

// Email notification function (mock implementation)
const sendEmailNotification = async (leave, action) => {
    // In production, integrate with email service like SendGrid, AWS SES, etc.
    console.log(`Email sent to leaves@domain.com:`);
    console.log(`Subject: Leave ${action} - ${leave.userId.name || 'Employee'}`);
    console.log(`Type: ${leave.leaveType}`);
    console.log(`Dates: ${leave.startDate} to ${leave.endDate}`);
    console.log(`Working Days: ${leave.workingDays}`);
    console.log(`Status: ${leave.status}`);
};

// Get all leaves (admin/manager only)
const getAllLeaves = async (req, res) => {
    try {
        const currentUser = req.user; // Will be set by auth middleware
        
        if (!currentUser) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }

        if (currentUser.role === 'employee' || currentUser.role === 'intern') {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. Only managers and admins can view all leaves.' 
            });
        }

        const leaves = await Leave.find()
            .populate('userId', 'name email department')
            .populate('approvedBy', 'name')
            .sort('-createdAt');

        res.json({
            success: true,
            leaves
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching leaves',
            error: error.message
        });
    }
};

// Get leaves for current user
const getMyLeaves = async (req, res) => {
    try {
        const currentUser = req.user;
        
        if (!currentUser) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }

        const leaves = await Leave.find({ userId: currentUser._id })
            .populate('approvedBy', 'name')
            .sort('-createdAt');

        res.json({
            success: true,
            leaves
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching leaves',
            error: error.message
        });
    }
};

// Get pending leaves (admin/manager only)
const getPendingLeaves = async (req, res) => {
    try {
        const currentUser = req.user;
        
        if (!currentUser) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }

        if (currentUser.role === 'employee' || currentUser.role === 'intern') {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. Only managers and admins can view pending leaves.' 
            });
        }

        const pendingLeaves = await Leave.find({ status: 'pending' })
            .populate('userId', 'name email department')
            .sort('-createdAt');

        res.json({
            success: true,
            leaves: pendingLeaves
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching pending leaves',
            error: error.message
        });
    }
};

// Apply for leave
const applyLeave = async (req, res) => {
    try {
        const currentUser = req.user;
        
        if (!currentUser) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }

        const { startDate, endDate, leaveType, reason, documents, isHalfDay } = req.body;

        // Validate required fields
        if (!startDate || !endDate || !leaveType || !reason) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        // Get system config
        const config = await Config.getConfig();
        const systemSettings = config.systemSettings;

        // Validate leave request
        const validation = await validateLeaveRequest(currentUser, {
            startDate,
            endDate,
            leaveType,
            documents
        }, systemSettings);

        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.message
            });
        }

        // Calculate working days
        const workingDays = await calculateWorkingDays(startDate, endDate, isHalfDay);

        // Check leave balance
        const user = await User.findById(currentUser._id);
        const availableBalance = user.leaveBalance[leaveType] || 0;

        let lopDays = 0;
        if (!['lop', 'wfh'].includes(leaveType) && workingDays > availableBalance) {
            lopDays = workingDays - availableBalance;
            if ((user.leaveBalance.lop + lopDays) > systemSettings.maxLOPDays) {
                return res.status(400).json({
                    success: false,
                    message: `Maximum LOP days (${systemSettings.maxLOPDays}) would be exceeded`
                });
            }
        }

        // Create leave request
        const newLeave = new Leave({
            userId: currentUser._id,
            startDate,
            endDate,
            leaveType,
            reason,
            workingDays,
            isHalfDay: isHalfDay || false,
            documents: documents || [],
            lopDays
        });

        await newLeave.save();
        
        // Populate user details for email
        await newLeave.populate('userId', 'name email');
        
        // Send email notification
        await sendEmailNotification(newLeave, 'Applied');

        res.json({
            success: true,
            message: 'Leave request submitted successfully',
            leave: newLeave
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error applying leave',
            error: error.message
        });
    }
};

// Validate leave request
const validateLeaveRequest = async (user, leaveData, systemSettings) => {
    // Check for overlapping leaves
    const hasOverlap = await checkOverlap(user._id, leaveData.startDate, leaveData.endDate);
    if (hasOverlap) {
        return { valid: false, message: 'Leave dates overlap with existing leave request' };
    }
    
    // Check if applying on weekend or holiday
    if (leaveData.leaveType !== 'wfh') {
        const startDate = new Date(leaveData.startDate);
        
        if (isWeekend(startDate) || await isHoliday(startDate)) {
            return { valid: false, message: 'Cannot apply leave starting on weekend or holiday' };
        }
    }
    
    // Check advance notice for casual and vacation leave
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const requestDate = new Date(leaveData.startDate);
    const daysDiff = daysDifference(today, requestDate);
    
    if (leaveData.leaveType === 'casual' || leaveData.leaveType === 'vacation') {
        const requiredNotice = systemSettings.advanceNotice[leaveData.leaveType];
        if (daysDiff < requiredNotice) {
            return { 
                valid: false, 
                message: `${leaveData.leaveType} leave must be applied ${requiredNotice} days in advance` 
            };
        }
    }
    
    // Check sick leave same-day cutoff
    if (leaveData.leaveType === 'sick' && daysDiff === 0) {
        const now = new Date();
        const [cutoffHour, cutoffMinute] = systemSettings.sickLeaveCutoffTime.split(':');
        const cutoff = new Date();
        cutoff.setHours(parseInt(cutoffHour), parseInt(cutoffMinute), 0, 0);
        
        if (now > cutoff) {
            return { 
                valid: false, 
                message: `Same-day sick leave must be applied before ${systemSettings.sickLeaveCutoffTime}` 
            };
        }
    }
    
    // Academic leave must have documents
    if (leaveData.leaveType === 'academic' && (!leaveData.documents || leaveData.documents.length === 0)) {
        return { valid: false, message: 'Academic leave requires supporting documents' };
    }
    
    return { valid: true };
};

// Update leave status (approve/reject)
const updateLeaveStatus = async (req, res) => {
    try {
        const currentUser = req.user;
        
        if (!currentUser) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }

        if (currentUser.role === 'employee' || currentUser.role === 'intern') {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. Only managers and admins can approve/reject leaves.' 
            });
        }

        const { leaveId } = req.params;
        const { status, rejectionReason } = req.body;

        // Validate status
        if (!status || !['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid status. Must be "approved" or "rejected".' 
            });
        }

        // Find leave request
        const leave = await Leave.findById(leaveId).populate('userId');
        if (!leave) {
            return res.status(404).json({ 
                success: false, 
                message: 'Leave request not found' 
            });
        }

        // Check if already processed
        if (leave.status !== 'pending') {
            return res.status(400).json({ 
                success: false, 
                message: 'Leave request has already been processed' 
            });
        }

        // Update leave status
        leave.status = status;
        
        if (status === 'approved') {
            leave.approvedBy = currentUser._id;
            leave.approvedOn = new Date();
            
            // Deduct leave balance
            const user = leave.userId;
            if (leave.leaveType !== 'wfh' && leave.leaveType !== 'lop') {
                const availableBalance = user.leaveBalance[leave.leaveType] || 0;
                
                if (leave.workingDays > availableBalance) {
                    // Partial deduction and LOP
                    const lopDays = leave.workingDays - availableBalance;
                    user.leaveBalance[leave.leaveType] = 0;
                    user.leaveBalance.lop += lopDays;
                    leave.lopDays = lopDays;
                } else {
                    // Full deduction from leave balance
                    user.leaveBalance[leave.leaveType] -= leave.workingDays;
                }
                
                leave.balanceDeducted = true;
                await user.save();
            }
        } else {
            leave.rejectedBy = currentUser._id;
            leave.rejectedOn = new Date();
            leave.rejectionReason = rejectionReason || '';
        }

        await leave.save();

        // Send email notification
        await sendEmailNotification(leave, status);

        res.json({
            success: true,
            message: `Leave request ${status} successfully`,
            leave
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating leave status',
            error: error.message
        });
    }
};

// Cancel leave
const cancelLeave = async (req, res) => {
    try {
        const currentUser = req.user;
        
        if (!currentUser) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }

        const { leaveId } = req.params;
        const { cancellationReason } = req.body;

        const leave = await Leave.findById(leaveId).populate('userId');
        if (!leave) {
            return res.status(404).json({ 
                success: false, 
                message: 'Leave request not found' 
            });
        }

        // Check if user can cancel
        if (leave.userId._id.toString() !== currentUser._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only cancel your own leave requests'
            });
        }

        // Check if leave can be cancelled
        if (!leave.canBeCancelled()) {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel leave after start date or if already cancelled'
            });
        }

        // If approved, restore leave balance
        if (leave.status === 'approved' && leave.balanceDeducted) {
            const user = leave.userId;
            
            if (leave.lopDays > 0) {
                // Restore from LOP first
                user.leaveBalance.lop -= leave.lopDays;
                const remainingDays = leave.workingDays - leave.lopDays;
                if (remainingDays > 0) {
                    user.leaveBalance[leave.leaveType] += remainingDays;
                }
            } else {
                // Restore full amount to leave type
                user.leaveBalance[leave.leaveType] += leave.workingDays;
            }
            
            await user.save();
        }

        // Update leave status
        leave.status = 'cancelled';
        leave.cancelledOn = new Date();
        leave.cancellationReason = cancellationReason || '';
        
        await leave.save();

        // Send email notification
        await sendEmailNotification(leave, 'Cancelled');

        res.json({
            success: true,
            message: 'Leave request cancelled successfully',
            leave
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error cancelling leave',
            error: error.message
        });
    }
};

// Get leave balance
const getLeaveBalance = async (req, res) => {
    try {
        const currentUser = req.user;
        
        if (!currentUser) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }

        const user = await User.findById(currentUser._id);
        
        res.json({
            success: true,
            balance: user.leaveBalance,
            carryForward: user.carryForward
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching leave balance',
            error: error.message
        });
    }
};

// Mark WFH
const markWFH = async (req, res) => {
    try {
        const currentUser = req.user;
        
        if (!currentUser) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }

        const { date, reason } = req.body;

        if (!date || !reason) {
            return res.status(400).json({ 
                success: false, 
                message: 'Date and reason are required' 
            });
        }

        // Validate date
        if (isWeekend(date) || await isHoliday(date)) {
            return res.status(400).json({
                success: false,
                message: 'Cannot mark WFH on weekends or holidays'
            });
        }

        // Check for existing leave on this date
        const hasOverlap = await checkOverlap(currentUser._id, date, date);
        if (hasOverlap) {
            return res.status(400).json({
                success: false,
                message: 'Leave already exists for this date'
            });
        }

        // Create WFH entry
        const wfh = new Leave({
            userId: currentUser._id,
            startDate: date,
            endDate: date,
            leaveType: 'wfh',
            reason: reason,
            workingDays: 1,
            status: 'approved' // WFH is auto-approved
        });

        await wfh.save();

        res.json({
            success: true,
            message: 'Work from home marked successfully',
            wfh
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error marking WFH',
            error: error.message
        });
    }
};

// Add comp off
const addCompOff = async (req, res) => {
    try {
        const currentUser = req.user;
        
        if (!currentUser) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }

        const { days, reason } = req.body;

        if (!days || !reason) {
            return res.status(400).json({ 
                success: false, 
                message: 'Days and reason are required' 
            });
        }

        if (days <= 0 || days > 5) {
            return res.status(400).json({ 
                success: false, 
                message: 'Comp off days must be between 1 and 5' 
            });
        }

        // Update user's comp off balance
        const user = await User.findById(currentUser._id);
        user.leaveBalance.compOff += parseFloat(days);
        await user.save();

        // Create a comp off credit record
        const compOffCredit = new Leave({
            userId: currentUser._id,
            leaveType: 'compOff',
            reason: `Comp Off Credit: ${reason}`,
            compOffDays: parseFloat(days),
            status: 'approved',
            workingDays: 0, // Credit entry, not actual leave
            startDate: new Date(),
            endDate: new Date()
        });

        await compOffCredit.save();

        res.json({
            success: true,
            message: 'Comp off added successfully',
            balance: user.leaveBalance
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error adding comp off',
            error: error.message
        });
    }
};

// Get holidays
const getHolidays = async (req, res) => {
    try {
        const year = req.query.year || new Date().getFullYear();
        const Holiday = require('../models/Holiday');
        
        const holidays = await Holiday.getHolidaysForYear(year);
        
        res.json({
            success: true,
            holidays
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching holidays',
            error: error.message
        });
    }
};

module.exports = {
    getAllLeaves,
    getMyLeaves,
    getPendingLeaves,
    applyLeave,
    updateLeaveStatus,
    cancelLeave,
    getLeaveBalance,
    markWFH,
    addCompOff,
    getHolidays
}; 