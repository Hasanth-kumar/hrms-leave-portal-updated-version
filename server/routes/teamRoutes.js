const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const teamController = require('../controllers/teamController');

// All routes require authentication
router.use(authenticate);

// Get team members (manager/admin only)
router.get('/members', authorize('manager', 'admin'), teamController.getTeamMembers);

module.exports = router; 