const express = require('express');
const router = express.Router();
const { 
    getLeaveAnalytics, 
    getLeavetrends, 
    getDepartmentAnalytics 
} = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticate);

// @route   GET /api/analytics/leaves
// @desc    Get comprehensive leave analytics
// @access  Manager/Admin
router.get('/leaves', getLeaveAnalytics);

// @route   GET /api/analytics/trends
// @desc    Get leave trends over time
// @access  Manager/Admin
router.get('/trends', getLeavetrends);

// @route   GET /api/analytics/departments
// @desc    Get department-wise analytics
// @access  Admin only
router.get('/departments', getDepartmentAnalytics);

module.exports = router;
