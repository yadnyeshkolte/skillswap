/**
 * User controller for Skill Swap Platform
 */
const { validationResult } = require('express-validator');
const userModel = require('../models/user.model');
const skillModel = require('../models/skill.model');
const swapModel = require('../models/swap.model');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

/**
 * @desc    Get all users with filtering
 * @route   GET /api/users
 * @access  Public
 */
exports.getUsers = async (req, res) => {
  try {
    const { skill, availability, search, page = 1, limit = 10 } = req.query;

    // Build filters object
    const filters = {};
    if (skill) filters.skill = skill;
    if (availability) filters.availability = availability;
    if (search) filters.search = search;

    // Get users
    const result = await userModel.getUsers(filters, parseInt(page), parseInt(limit));

    res.status(200).json({
      success: true,
      data: result.users,
      pagination: result.pagination
    });
  } catch (err) {
    console.error('Error in getUsers:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * @desc    Get user by ID (public profiles are accessible to all, private profiles only to the owner and admins)
 * @route   GET /api/users/:id
 * @access  Public
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user is requesting their own profile or is an admin
    const isOwnProfile = req.user && req.user.id === id;
    const isAdmin = req.user && req.user.role === 'admin';
    const includePrivate = isOwnProfile || isAdmin;
    
    // Get user
    const user = await userModel.getUserById(id, includePrivate);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // If profile is private and requester doesn't have access, return limited info
    if (!user.isPublic && !includePrivate) {
      return res.status(200).json({
        success: true,
        data: {
          id: user.id,
          name: user.name,
          isPublic: user.isPublic,
          message: 'This profile is private'
        }
      });
    }
    
    // Get feedback stats if available
    if (user.reviewCount > 0) {
      const feedbackStats = await swapModel.getUserFeedbackStats(id);
      user.feedbackStats = feedbackStats;
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error('Error in getUserById:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
exports.updateProfile = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    const { name, location, availability } = req.body;
    
    // Build update object
    const updateData = {};
    if (name) updateData.name = name;
    if (location !== undefined) updateData.location = location;
    if (availability !== undefined) updateData.availability = availability;
    
    // Update user
    const user = await userModel.updateProfile(req.user.id, updateData);
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error('Error in updateProfile:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * @desc    Upload/update profile photo
 * @route   PUT /api/users/profile/photo
 * @access  Private
 */
exports.updateProfilePhoto = async (req, res) => {
  try {
    // Check if file exists
    if (!req.files || !req.files.photo) {
      return res.status(400).json({
        success: false,
        error: 'Please upload a file'
      });
    }
    
    const file = req.files.photo;
    
    // Check file type
    if (!file.mimetype.startsWith('image')) {
      return res.status(400).json({
        success: false,
        error: 'Please upload an image file'
      });
    }
    
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'Image must be less than 2MB'
      });
    }
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Create custom filename
    const fileExt = path.extname(file.name);
    const fileName = `user_${req.user.id}_${crypto.randomBytes(8).toString('hex')}${fileExt}`;
    const filePath = path.join(uploadsDir, fileName);
    
    // Move file
    file.mv(filePath, async (err) => {
      if (err) {
        console.error('Error moving file:', err);
        return res.status(500).json({
          success: false,
          error: 'Problem with file upload'
        });
      }
      
      // Get current user to check if they already have a profile photo
      const currentUser = await userModel.getUserById(req.user.id, true);
      
      // Delete old profile photo if exists
      if (currentUser.profilePhoto) {
        const oldFilePath = path.join(uploadsDir, path.basename(currentUser.profilePhoto));
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      
      // Update user profile with new photo URL
      const photoUrl = `/uploads/${fileName}`;
      const user = await userModel.updateProfile(req.user.id, { profilePhoto: photoUrl });
      
      res.status(200).json({
        success: true,
        data: user
      });
    });
  } catch (err) {
    console.error('Error in updateProfilePhoto:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * @desc    Delete profile photo
 * @route   DELETE /api/users/profile/photo
 * @access  Private
 */
exports.deleteProfilePhoto = async (req, res) => {
  try {
    // Get current user
    const user = await userModel.getUserById(req.user.id, true);
    
    // Check if user has a profile photo
    if (!user.profilePhoto) {
      return res.status(400).json({
        success: false,
        error: 'No profile photo to delete'
      });
    }
    
    // Delete profile photo file
    const filePath = path.join(__dirname, '..', user.profilePhoto);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Update user profile to remove photo URL
    const updatedUser = await userModel.updateProfile(req.user.id, { profilePhoto: null });
    
    res.status(200).json({
      success: true,
      data: updatedUser
    });
  } catch (err) {
    console.error('Error in deleteProfilePhoto:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * @desc    Toggle profile visibility (public/private)
 * @route   PUT /api/users/profile/visibility
 * @access  Private
 */
exports.toggleProfileVisibility = async (req, res) => {
  try {
    // Toggle profile visibility
    const user = await userModel.toggleProfileVisibility(req.user.id);
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error('Error in toggleProfileVisibility:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};