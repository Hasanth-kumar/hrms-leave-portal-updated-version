const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadAcademicDocuments, handleUploadError } = require('../middleware/upload');

// All routes require authentication
router.use(authenticate);

// Employee routes
router.get('/balance', leaveController.getLeaveBalance);
router.get('/holidays', leaveController.getHolidays);
router.get('/my-leaves', leaveController.getMyLeaves);

// Apply for leave with optional file upload for academic leave
router.post('/apply', uploadAcademicDocuments, handleUploadError, leaveController.applyLeave);

router.post('/wfh', leaveController.markWFH);
router.post('/comp-off', leaveController.addCompOff);
router.put('/cancel/:leaveId', leaveController.cancelLeave);

// Document download route (accessible to employee, manager, admin)
router.get('/documents/:leaveId/:documentIndex', leaveController.downloadDocument);

// Manager/Admin only routes
router.get('/all', authorize('manager', 'admin'), leaveController.getAllLeaves);
router.get('/pending', authorize('manager', 'admin'), leaveController.getPendingLeaves);
router.put('/update-status/:leaveId', authorize('manager', 'admin'), leaveController.updateLeaveStatus);

module.exports = router; 