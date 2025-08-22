const User = require('../models/User');
const Leave = require('../models/Leave');
const Holiday = require('../models/Holiday');
const { startOfYear, endOfYear, startOfMonth, endOfMonth, format, eachMonthOfInterval, subYears } = require('date-fns');

// Get comprehensive leave analytics
const getLeaveAnalytics = async (req, res) => {
    try {
        const currentUser = req.user;
        
        if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. Only managers and admins can view analytics.' 
            });
        }

        const { year = new Date().getFullYear(), department, userId } = req.query;
        const targetYear = parseInt(year);
        
        // Build base query for leaves
        let leaveQuery = {
            createdAt: {
                $gte: startOfYear(new Date(targetYear, 0, 1)),
                $lte: endOfYear(new Date(targetYear, 0, 1))
            }
        };

        // If manager, restrict to their team
        if (currentUser.role === 'manager') {
            const teamMembers = await User.find({ managerId: currentUser._id }).select('_id');
            const teamIds = teamMembers.map(member => member._id);
            teamIds.push(currentUser._id); // Include manager themselves
            leaveQuery.userId = { $in: teamIds };
        }

        // Add department filter if specified
        if (department && department !== 'all') {
            const deptUsers = await User.find({ department }).select('_id');
            const deptUserIds = deptUsers.map(user => user._id);
            
            if (leaveQuery.userId) {
                // Intersection of team and department
                leaveQuery.userId.$in = leaveQuery.userId.$in.filter(id => 
                    deptUserIds.some(deptId => deptId.toString() === id.toString())
                );
            } else {
                leaveQuery.userId = { $in: deptUserIds };
            }
        }

        // Add user filter if specified
        if (userId && userId !== 'all') {
            leaveQuery.userId = userId;
        }

        // Get leaves with user population
        const leaves = await Leave.find(leaveQuery)
            .populate('userId', 'name department type role')
            .populate('approvedBy', 'name')
            .sort({ createdAt: -1 });

        // Calculate analytics
        const analytics = await calculateLeaveAnalytics(leaves, targetYear);
        
        res.json({
            success: true,
            analytics,
            totalRecords: leaves.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching leave analytics',
            error: error.message
        });
    }
};

// Calculate detailed analytics from leaves data
const calculateLeaveAnalytics = async (leaves, year) => {
    const analytics = {
        summary: {
            totalLeaves: leaves.length,
            approvedLeaves: 0,
            pendingLeaves: 0,
            rejectedLeaves: 0,
            cancelledLeaves: 0,
            totalLeaveDays: 0,
            averageLeaveDuration: 0
        },
        leavesByType: {},
        leavesByMonth: [],
        leavesByDepartment: {},
        leavesByStatus: {},
        topLeaveUsers: [],
        lopAnalytics: {
            totalLOPDays: 0,
            usersWithLOP: 0,
            avgLOPPerUser: 0
        },
        trends: {
            comparedToLastYear: {},
            monthlyTrends: []
        }
    };

    // Initialize monthly data
    const months = eachMonthOfInterval({
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31)
    });

    analytics.leavesByMonth = months.map(month => ({
        month: format(month, 'MMM'),
        monthNumber: month.getMonth() + 1,
        totalLeaves: 0,
        approvedLeaves: 0,
        pendingLeaves: 0,
        rejectedLeaves: 0,
        totalDays: 0
    }));

    // Process each leave
    const userLeaveCount = {};
    const userLOPDays = {};

    leaves.forEach(leave => {
        const leaveMonth = new Date(leave.createdAt).getMonth();
        const monthData = analytics.leavesByMonth[leaveMonth];
        const leaveType = leave.leaveType;
        const status = leave.status;
        const department = leave.userId?.department || 'Unknown';
        const userId = leave.userId?._id?.toString();
        const userName = leave.userId?.name || 'Unknown User';

        // Summary calculations
        analytics.summary.totalLeaveDays += leave.workingDays || 0;
        
        switch (status) {
            case 'approved':
                analytics.summary.approvedLeaves++;
                monthData.approvedLeaves++;
                break;
            case 'pending':
                analytics.summary.pendingLeaves++;
                monthData.pendingLeaves++;
                break;
            case 'rejected':
                analytics.summary.rejectedLeaves++;
                monthData.rejectedLeaves++;
                break;
            case 'cancelled':
                analytics.summary.cancelledLeaves++;
                break;
        }

        // Monthly data
        monthData.totalLeaves++;
        monthData.totalDays += leave.workingDays || 0;

        // Leave type analysis
        if (!analytics.leavesByType[leaveType]) {
            analytics.leavesByType[leaveType] = {
                count: 0,
                totalDays: 0,
                approvedCount: 0,
                pendingCount: 0,
                rejectedCount: 0
            };
        }
        analytics.leavesByType[leaveType].count++;
        analytics.leavesByType[leaveType].totalDays += leave.workingDays || 0;
        analytics.leavesByType[leaveType][`${status}Count`]++;

        // Department analysis
        if (!analytics.leavesByDepartment[department]) {
            analytics.leavesByDepartment[department] = {
                count: 0,
                totalDays: 0,
                employees: new Set()
            };
        }
        analytics.leavesByDepartment[department].count++;
        analytics.leavesByDepartment[department].totalDays += leave.workingDays || 0;
        if (userId) {
            analytics.leavesByDepartment[department].employees.add(userId);
        }

        // Status analysis
        if (!analytics.leavesByStatus[status]) {
            analytics.leavesByStatus[status] = 0;
        }
        analytics.leavesByStatus[status]++;

        // User leave count
        if (userId) {
            if (!userLeaveCount[userId]) {
                userLeaveCount[userId] = {
                    name: userName,
                    count: 0,
                    totalDays: 0,
                    department: department
                };
            }
            userLeaveCount[userId].count++;
            userLeaveCount[userId].totalDays += leave.workingDays || 0;
        }

        // LOP Analysis
        if (leave.lopDays && leave.lopDays > 0) {
            analytics.lopAnalytics.totalLOPDays += leave.lopDays;
            if (userId) {
                if (!userLOPDays[userId]) {
                    userLOPDays[userId] = 0;
                }
                userLOPDays[userId] += leave.lopDays;
            }
        }
    });

    // Finalize calculations
    analytics.summary.averageLeaveDuration = analytics.summary.totalLeaves > 0 
        ? (analytics.summary.totalLeaveDays / analytics.summary.totalLeaves).toFixed(1)
        : 0;

    // Convert department employees Set to count
    Object.keys(analytics.leavesByDepartment).forEach(dept => {
        analytics.leavesByDepartment[dept].employeeCount = analytics.leavesByDepartment[dept].employees.size;
        delete analytics.leavesByDepartment[dept].employees;
    });

    // Top leave users
    analytics.topLeaveUsers = Object.values(userLeaveCount)
        .sort((a, b) => b.totalDays - a.totalDays)
        .slice(0, 10);

    // LOP analytics
    analytics.lopAnalytics.usersWithLOP = Object.keys(userLOPDays).length;
    analytics.lopAnalytics.avgLOPPerUser = analytics.lopAnalytics.usersWithLOP > 0
        ? (analytics.lopAnalytics.totalLOPDays / analytics.lopAnalytics.usersWithLOP).toFixed(1)
        : 0;

    // Compare with last year (simplified - just get counts)
    try {
        const lastYearLeaves = await Leave.countDocuments({
            createdAt: {
                $gte: startOfYear(new Date(year - 1, 0, 1)),
                $lte: endOfYear(new Date(year - 1, 0, 1))
            }
        });

        analytics.trends.comparedToLastYear = {
            currentYear: analytics.summary.totalLeaves,
            lastYear: lastYearLeaves,
            changePercent: lastYearLeaves > 0 
                ? (((analytics.summary.totalLeaves - lastYearLeaves) / lastYearLeaves) * 100).toFixed(1)
                : analytics.summary.totalLeaves > 0 ? 100 : 0
        };
    } catch (error) {
        console.error('Error calculating year-over-year comparison:', error);
    }

    return analytics;
};

// Get leave trends over time
const getLeavetrends = async (req, res) => {
    try {
        const currentUser = req.user;
        
        if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. Only managers and admins can view trends.' 
            });
        }

        const { period = '12months', leaveType = 'all' } = req.query;
        
        let startDate, endDate, groupBy;
        
        switch (period) {
            case '6months':
                startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 6);
                endDate = new Date();
                groupBy = { 
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' }
                };
                break;
            case '12months':
            default:
                startDate = new Date();
                startDate.setFullYear(startDate.getFullYear() - 1);
                endDate = new Date();
                groupBy = { 
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' }
                };
                break;
            case '2years':
                startDate = new Date();
                startDate.setFullYear(startDate.getFullYear() - 2);
                endDate = new Date();
                groupBy = { 
                    year: { $year: '$createdAt' },
                    quarter: { $ceil: { $divide: [{ $month: '$createdAt' }, 3] } }
                };
                break;
        }

        // Build aggregation pipeline
        const matchStage = {
            createdAt: { $gte: startDate, $lte: endDate }
        };

        if (leaveType !== 'all') {
            matchStage.leaveType = leaveType;
        }

        // If manager, restrict to their team
        if (currentUser.role === 'manager') {
            const teamMembers = await User.find({ managerId: currentUser._id }).select('_id');
            const teamIds = teamMembers.map(member => member._id);
            teamIds.push(currentUser._id);
            matchStage.userId = { $in: teamIds };
        }

        const trends = await Leave.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: groupBy,
                    totalLeaves: { $sum: 1 },
                    approvedLeaves: {
                        $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
                    },
                    pendingLeaves: {
                        $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                    },
                    rejectedLeaves: {
                        $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
                    },
                    totalDays: { $sum: '$workingDays' },
                    lopDays: { $sum: '$lopDays' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.quarter': 1 } }
        ]);

        res.json({
            success: true,
            trends,
            period,
            leaveType
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching leave trends',
            error: error.message
        });
    }
};

// Get department-wise analytics
const getDepartmentAnalytics = async (req, res) => {
    try {
        const currentUser = req.user;
        
        if (!currentUser || currentUser.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. Only admins can view department analytics.' 
            });
        }

        const { year = new Date().getFullYear() } = req.query;
        const targetYear = parseInt(year);

        // Get all departments with their employees
        const departments = await User.aggregate([
            {
                $group: {
                    _id: '$department',
                    totalEmployees: { $sum: 1 },
                    regularEmployees: {
                        $sum: { $cond: [{ $eq: ['$type', 'regular'] }, 1, 0] }
                    },
                    interns: {
                        $sum: { $cond: [{ $eq: ['$type', 'intern'] }, 1, 0] }
                    }
                }
            },
            { $match: { _id: { $ne: null } } },
            { $sort: { _id: 1 } }
        ]);

        // Get leave data for each department
        const departmentAnalytics = await Promise.all(
            departments.map(async (dept) => {
                const deptUsers = await User.find({ department: dept._id }).select('_id');
                const userIds = deptUsers.map(user => user._id);

                const leaves = await Leave.find({
                    userId: { $in: userIds },
                    createdAt: {
                        $gte: startOfYear(new Date(targetYear, 0, 1)),
                        $lte: endOfYear(new Date(targetYear, 0, 1))
                    }
                });

                const deptStats = {
                    department: dept._id,
                    totalEmployees: dept.totalEmployees,
                    regularEmployees: dept.regularEmployees,
                    interns: dept.interns,
                    totalLeaves: leaves.length,
                    approvedLeaves: leaves.filter(l => l.status === 'approved').length,
                    pendingLeaves: leaves.filter(l => l.status === 'pending').length,
                    rejectedLeaves: leaves.filter(l => l.status === 'rejected').length,
                    totalLeaveDays: leaves.reduce((sum, l) => sum + (l.workingDays || 0), 0),
                    avgLeavesPerEmployee: dept.totalEmployees > 0 ? (leaves.length / dept.totalEmployees).toFixed(1) : 0,
                    avgDaysPerEmployee: dept.totalEmployees > 0 ? 
                        (leaves.reduce((sum, l) => sum + (l.workingDays || 0), 0) / dept.totalEmployees).toFixed(1) : 0,
                    leaveTypes: {}
                };

                // Calculate leave types distribution
                leaves.forEach(leave => {
                    if (!deptStats.leaveTypes[leave.leaveType]) {
                        deptStats.leaveTypes[leave.leaveType] = 0;
                    }
                    deptStats.leaveTypes[leave.leaveType]++;
                });

                return deptStats;
            })
        );

        res.json({
            success: true,
            departmentAnalytics: departmentAnalytics.sort((a, b) => b.totalLeaves - a.totalLeaves),
            year: targetYear
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching department analytics',
            error: error.message
        });
    }
};

module.exports = {
    getLeaveAnalytics,
    getLeavetrends,
    getDepartmentAnalytics
};

