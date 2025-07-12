/**
 * User routes for Skill Swap Platform
 */
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');

// Import controllers
// Note: These controller files will be created later
const { 
  getUsers,
  getUserById,
  updateProfile,
  updateProfilePhoto,
  deleteProfilePhoto,
  toggleProfileVisibility
} = require('../controllers/user.controller');

// Import middleware
const { protect, authorize } = require('../middleware/auth.middleware');

// @route   GET /api/users
// @desc    Get all users (with filtering options)
// @access  Public
router.get('/', getUsers);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Public (for public profiles) / Private (for private profiles)
router.get('/:id', getUserById);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put(
  '/profile',
  [
    check('name', 'Name is required').optional(),
    check('location', 'Location must be a string').optional().isString(),
    check('availability', 'Availability must be a string').optional().isString()
  ],
  protect,
  updateProfile
);

// @route   PUT /api/users/profile/photo
// @desc    Upload/update profile photo
// @access  Private
router.put('/profile/photo', protect, updateProfilePhoto);

// @route   DELETE /api/users/profile/photo
// @desc    Delete profile photo
// @access  Private
router.delete('/profile/photo', protect, deleteProfilePhoto);

// @route   PUT /api/users/profile/visibility
// @desc    Toggle profile visibility (public/private)
// @access  Private
router.put('/profile/visibility', protect, toggleProfileVisibility);

module.exports = router;