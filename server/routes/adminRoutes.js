const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Leave quota management
router.get('/quotas', adminController.getQuotas);
router.put('/quotas', adminController.updateQuotas);

// Holiday management
router.get('/holidays', adminController.getHolidaysList);
router.post('/holidays', adminController.addHoliday);
router.delete('/holidays/:holidayId', adminController.deleteHoliday);

// User management
router.get('/users', adminController.getUsers);
router.post('/users', adminController.addUser);
router.put('/users/:userId', adminController.updateUser);
router.patch('/users/:userId/toggle-status', adminController.toggleUserStatus);

// System settings
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

// Accrual management
router.get('/accrual/info', adminController.getAccrualInfo);
router.post('/accrual/run', adminController.runMonthlyAccrual);
router.put('/accrual/rates', adminController.updateAccrualRates);

// Statistics
router.get('/stats/leaves', adminController.getLeaveStats);

module.exports = router; 