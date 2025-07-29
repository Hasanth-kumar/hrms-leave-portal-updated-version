const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Admin-only routes
router.get('/users', authorize('admin'), adminController.getUsers);
router.post('/users', authorize('admin'), adminController.addUser);
router.put('/users/:userId', authorize('admin'), adminController.updateUser);
router.get('/settings', authorize('admin'), adminController.getSettings);
router.put('/settings', authorize('admin'), adminController.updateSettings);

// Manager and Admin routes (for reports and departments)
router.get('/departments', authorize('manager', 'admin'), adminController.getDepartments);
router.get('/leave-stats', authorize('manager', 'admin'), adminController.getLeaveStats);
router.post('/reports/export', authorize('manager', 'admin'), adminController.exportReport);

module.exports = router; 