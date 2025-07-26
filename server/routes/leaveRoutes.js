const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Employee routes
router.get('/balance', leaveController.getLeaveBalance);
router.get('/holidays', leaveController.getHolidays);
router.get('/my-leaves', leaveController.getMyLeaves);
router.post('/apply', leaveController.applyLeave);
router.post('/wfh', leaveController.markWFH);
router.post('/comp-off', leaveController.addCompOff);
router.put('/cancel/:leaveId', leaveController.cancelLeave);

// Manager/Admin only routes
router.get('/all', authorize('manager', 'admin'), leaveController.getAllLeaves);
router.get('/pending', authorize('manager', 'admin'), leaveController.getPendingLeaves);
router.put('/update-status/:leaveId', authorize('manager', 'admin'), leaveController.updateLeaveStatus);

module.exports = router; 