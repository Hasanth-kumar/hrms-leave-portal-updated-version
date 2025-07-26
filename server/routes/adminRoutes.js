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
router.put('/users/:userId/toggle-status', adminController.toggleUserStatus);

// System settings
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

// Accrual management
router.get('/accrual-info', adminController.getAccrualInfo);
router.post('/accrual/run', adminController.runMonthlyAccrual);
router.put('/accrual-rates', adminController.updateAccrualRates);

// Statistics and reporting
router.get('/leave-stats', adminController.getLeaveStats);

// LOP Management
router.get('/lop-settings', adminController.getLOPSettings);
router.put('/lop-settings', adminController.updateLOPSettings);
router.get('/lop-report', adminController.getLOPReport);
router.post('/convert-negative-balances/:userId', adminController.convertUserNegativeBalances);
router.post('/bulk-convert-negative-balances', adminController.bulkConvertNegativeBalances);

module.exports = router; 