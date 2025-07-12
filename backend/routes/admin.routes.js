/**
 * Admin routes for Skill Swap Platform
 */
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');

// Import controllers
// Note: These controller files will be created later
const { 
  getUsers,
  getUserById,
  banUser,
  unbanUser,
  moderateSkill,
  getSwapRequests,
  sendPlatformMessage,
  generateUserReport,
  generateSwapReport,
  generateFeedbackReport
} = require('../controllers/admin.controller');

// Import middleware
const { protect, authorize } = require('../middleware/auth.middleware');

// All admin routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// @route   GET /api/admin/users
// @desc    Get all users (with filtering options)
// @access  Admin
router.get('/users', getUsers);

// @route   GET /api/admin/users/:id
// @desc    Get user by ID
// @access  Admin
router.get('/users/:id', getUserById);

// @route   PUT /api/admin/users/:id/ban
// @desc    Ban a user
// @access  Admin
router.put(
  '/users/:id/ban',
  [
    check('reason', 'Reason is required').not().isEmpty()
  ],
  banUser
);

// @route   PUT /api/admin/users/:id/unban
// @desc    Unban a user
// @access  Admin
router.put('/users/:id/unban', unbanUser);

// @route   PUT /api/admin/skills/:id/moderate
// @desc    Moderate a skill (approve/reject)
// @access  Admin
router.put(
  '/skills/:id/moderate',
  [
    check('status', 'Status is required').isIn(['approved', 'rejected']),
    check('reason', 'Reason is required for rejection').custom((value, { req }) => {
      if (req.body.status === 'rejected' && !value) {
        throw new Error('Reason is required for rejection');
      }
      return true;
    })
  ],
  moderateSkill
);

// @route   GET /api/admin/swaps
// @desc    Get all swap requests (with filtering options)
// @access  Admin
router.get('/swaps', getSwapRequests);

// @route   POST /api/admin/messages
// @desc    Send platform-wide message
// @access  Admin
router.post(
  '/messages',
  [
    check('title', 'Title is required').not().isEmpty(),
    check('message', 'Message is required').not().isEmpty(),
    check('type', 'Type is required').isIn(['info', 'warning', 'alert'])
  ],
  sendPlatformMessage
);

// @route   GET /api/admin/reports/users
// @desc    Generate user activity report
// @access  Admin
router.get('/reports/users', generateUserReport);

// @route   GET /api/admin/reports/swaps
// @desc    Generate swap statistics report
// @access  Admin
router.get('/reports/swaps', generateSwapReport);

// @route   GET /api/admin/reports/feedback
// @desc    Generate feedback logs report
// @access  Admin
router.get('/reports/feedback', generateFeedbackReport);

module.exports = router;