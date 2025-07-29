const User = require('../models/User');
const Leave = require('../models/Leave');
const Config = require('../models/Config');
const emailService = require('../services/emailService');
const { 
    calculateWorkingDays, 
    checkOverlap, 
    isWeekend, 
    isHoliday,
    daysDifference 
} = require('../utils/dateHelpers');

// Enhanced email notification function
const sendEmailNotification = async (leave, action) => {
    try {
        // Send different types of emails based on leave type and action
        if (leave.leaveType === 'academic') {
            await emailService.sendAcademicLeaveEmail(leave, action);
        } else {
            await emailService.sendLeaveApplicationEmail(leave, action);
        }
        
        console.log(`📧 Email notification sent for leave ${action}: ${leave.userId.name} (${leave.leaveType})`);
    } catch (error) {
        console.error('Failed to send email notification:', error);
    }
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

        let { startDate, endDate, leaveType, reason, isHalfDay } = req.body;
        
        // Handle file uploads if present
        let documents = [];
        if (req.files && req.files.length > 0) {
            documents = req.files.map(file => ({
                fileName: file.originalname,
                filePath: file.path,
                fileSize: file.size,
                mimeType: file.mimetype,
                uploadedAt: new Date()
            }));
        }

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
            documents,
            reason
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
            documents: documents,
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

// Enhanced validation function for leave requests
const validateLeaveRequest = async (user, leaveData, systemSettings) => {
    const { startDate, endDate, leaveType, documents, reason } = leaveData;
    
    // Check for overlapping leaves
    const hasOverlap = await checkOverlap(user._id, startDate, endDate);
    if (hasOverlap) {
        return { valid: false, message: 'Leave dates overlap with existing leave request' };
    }
    
    // Check if applying on weekend or holiday
    if (leaveType !== 'wfh') {
        const startDateObj = new Date(startDate);
        
        if (isWeekend(startDateObj) || await isHoliday(startDateObj)) {
            return { valid: false, message: 'Cannot apply leave starting on weekend or holiday' };
        }
    }
    
    // Get full user object for LOP checking
    const fullUser = await User.findById(user._id);
    
    // Check LOP limits before allowing new leave
    const lopStatus = await fullUser.checkLOPLimits();
    
    if (lopStatus.exceedsYearlyLimit && systemSettings.lopSettings.restrictLeaveAfterMaxLOP) {
        return {
            valid: false,
            message: `Cannot apply for leave. You have exceeded the maximum LOP limit of ${lopStatus.maxYearlyLOP} days for this year (Current: ${lopStatus.yearlyLOP} days).`
        };
    }
    
    // Calculate working days for this leave request
    const leaveDays = await calculateWorkingDays(startDate, endDate);
    
    // Check if this leave would cause LOP and validate against limits
    if (!['lop', 'wfh'].includes(leaveType)) {
        const availableBalance = fullUser.leaveBalance[leaveType] || 0;
        if (leaveDays > availableBalance) {
            const potentialLOPDays = leaveDays - availableBalance;
            
            // Check if adding this LOP would exceed limits
            if (lopStatus.yearlyLOP + potentialLOPDays > lopStatus.maxYearlyLOP) {
                return {
                    valid: false,
                    message: `This leave request would result in ${potentialLOPDays} LOP days, which would exceed your yearly LOP limit of ${lopStatus.maxYearlyLOP} days. Current LOP: ${lopStatus.yearlyLOP} days.`
                };
            }
            
            if (lopStatus.monthlyLOP + potentialLOPDays > lopStatus.maxMonthlyLOP) {
                return {
                    valid: false,
                    message: `This leave request would result in ${potentialLOPDays} LOP days, which would exceed your monthly LOP limit of ${lopStatus.maxMonthlyLOP} days. Current monthly LOP: ${lopStatus.monthlyLOP} days.`
                };
            }
            
            // Warn user about LOP
            if (potentialLOPDays > 0) {
                return {
                    valid: true,
                    warning: `This leave request will result in ${potentialLOPDays} Loss of Pay (LOP) days due to insufficient leave balance.`,
                    lopDays: potentialLOPDays
                };
            }
        }
    }
    
    // Check advance notice for different leave types
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const requestDate = new Date(startDate);
    const daysDiff = daysDifference(today, requestDate);
    
    if (leaveType === 'casual' || leaveType === 'vacation') {
        const requiredNotice = systemSettings.advanceNotice[leaveType];
        if (daysDiff < requiredNotice) {
            return { 
                valid: false, 
                message: `${leaveType} leave must be applied ${requiredNotice} days in advance` 
            };
        }
    }
    
    // Enhanced Academic Leave Validation
    if (leaveType === 'academic') {
        const academicSettings = systemSettings.academicLeaveSettings;
        
        // Check advance notice requirement
        const requiredNotice = academicSettings.minAdvanceNotice || 14;
        if (daysDiff < requiredNotice) {
            return { 
                valid: false, 
                message: `Academic leave must be applied at least ${requiredNotice} days in advance` 
            };
        }
        
        // Check if documents are required and provided
        if (academicSettings.requireDocuments && (!documents || documents.length === 0)) {
            return { 
                valid: false, 
                message: 'Academic leave requires supporting documents. Please upload relevant documents.' 
            };
        }
        
        // Check maximum documents limit
        if (documents && documents.length > academicSettings.maxDocuments) {
            return { 
                valid: false, 
                message: `Maximum ${academicSettings.maxDocuments} documents allowed for academic leave` 
            };
        }
        
        // Check consecutive days limit
        if (leaveDays > academicSettings.maxConsecutiveDays) {
            return { 
                valid: false, 
                message: `Academic leave cannot exceed ${academicSettings.maxConsecutiveDays} consecutive working days` 
            };
        }
        
        // Check reason length for academic leave
        if (!reason || reason.trim().length < 50) {
            return { 
                valid: false, 
                message: 'Academic leave requires a detailed reason (minimum 50 characters)' 
            };
        }
        
        // Additional validation: Check if user has sufficient academic leave balance
        const academicBalance = fullUser.leaveBalance.academic || 0;
        if (leaveDays > academicBalance) {
            const lopDays = leaveDays - academicBalance;
            return { 
                valid: true,
                warning: `Insufficient academic leave balance. ${lopDays} days will be marked as LOP.`,
                lopDays: lopDays
            };
        }
    }
    
    // Check sick leave same-day cutoff
    if (leaveType === 'sick' && daysDiff === 0) {
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

        // Special handling for Academic Leave approval
        if (leave.leaveType === 'academic') {
            const config = await Config.getConfig();
            const academicSettings = config.systemSettings.academicLeaveSettings;
            
            // Check if HR approval is required and current user is HR/Admin
            if (academicSettings.requireHRApproval && currentUser.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Academic leave requires HR/Admin approval'
                });
            }
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
                    
                    // Add LOP days using the new tracking method
                    await user.addLOPDays(lopDays, `Leave approval - ${leave.leaveType} leave insufficient balance`, leave._id);
                    
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

// Get LOP status for current user
const getLOPStatus = async (req, res) => {
    try {
        const currentUser = req.user;
        
        if (!currentUser) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }

        const user = await User.findById(currentUser._id);
        const lopStatus = await user.checkLOPLimits();
        
        res.json({
            success: true,
            lopStatus: {
                ...lopStatus,
                lopHistory: user.lopTracking.lopHistory || [],
                totalLOPBalance: user.leaveBalance.lop || 0
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching LOP status',
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

// Download document (for academic leave)
const downloadDocument = async (req, res) => {
    try {
        const currentUser = req.user;
        const { leaveId, documentIndex } = req.params;
        
        if (!currentUser) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }

        // Find the leave request
        const leave = await Leave.findById(leaveId).populate('userId');
        if (!leave) {
            return res.status(404).json({ 
                success: false, 
                message: 'Leave request not found' 
            });
        }

        // Check if user has permission to view documents
        const canView = leave.userId._id.toString() === currentUser._id.toString() || 
                       currentUser.role === 'manager' || 
                       currentUser.role === 'admin';
        
        if (!canView) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You cannot view these documents.'
            });
        }

        // Check if document exists
        if (!leave.documents || !leave.documents[documentIndex]) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }

        const document = leave.documents[documentIndex];
        const fs = require('fs');
        const path = require('path');
        
        // Check if file exists
        if (!fs.existsSync(document.filePath)) {
            return res.status(404).json({
                success: false,
                message: 'Document file not found on server'
            });
        }

        // Set appropriate headers
        res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
        res.setHeader('Content-Type', document.mimeType);
        
        // Stream the file
        const fileStream = fs.createReadStream(document.filePath);
        fileStream.pipe(res);
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error downloading document',
            error: error.message
        });
    }
};

// Get team leaves (manager/admin only)
const getTeamLeaves = async (req, res) => {
    try {
        const currentUser = req.user;
        
        if (!currentUser) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }

        // Get all users in the manager's department
        const teamMembers = await User.find({ 
            $or: [
                { managerId: currentUser._id },
                { department: currentUser.department }
            ],
            _id: { $ne: currentUser._id }
        });
        
        const teamMemberIds = teamMembers.map(member => member._id);
        
        // Get leaves for team members
        const leaves = await Leave.find({
            userId: { $in: teamMemberIds }
        })
        .populate('userId', 'name email department')
        .populate('approvedBy', 'name')
        .sort('-createdAt');
        
        res.json({
            success: true,
            data: {
                leaves,
                teamMembers: teamMembers.map(member => ({
                    id: member._id,
                    name: member.name,
                    email: member.email,
                    department: member.department
                }))
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching team leaves',
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
    getLOPStatus,
    markWFH,
    addCompOff,
    getHolidays,
    downloadDocument,
    getTeamLeaves
}; 