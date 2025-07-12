/**
 * Swap request controller for Skill Swap Platform
 */
const { validationResult } = require('express-validator');
const swapModel = require('../models/swap.model');
const userModel = require('../models/user.model');
const skillModel = require('../models/skill.model');

/**
 * @desc    Get all swap requests for the current user
 * @route   GET /api/swaps
 * @access  Private
 */
exports.getSwapRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    // Build options object
    const options = {
      page: parseInt(page),
      limit: parseInt(limit)
    };
    
    if (status) options.status = status;
    
    // Get swap requests
    const result = await swapModel.getSwapRequests(req.user.id, options);
    
    res.status(200).json({
      success: true,
      data: result.swapRequests,
      pagination: result.pagination
    });
  } catch (err) {
    console.error('Error in getSwapRequests:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * @desc    Get swap request by ID
 * @route   GET /api/swaps/:id
 * @access  Private
 */
exports.getSwapRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get swap request
    const swap = await swapModel.getSwapRequestById(id);
    
    if (!swap) {
      return res.status(404).json({
        success: false,
        error: 'Swap request not found'
      });
    }
    
    // Check if user is participant
    if (swap.senderId !== req.user.id && swap.receiverId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this swap request'
      });
    }
    
    res.status(200).json({
      success: true,
      data: swap
    });
  } catch (err) {
    console.error('Error in getSwapRequestById:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * @desc    Create a new swap request
 * @route   POST /api/swaps
 * @access  Private
 */
exports.createSwapRequest = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    const { receiverId, offeredSkillId, wantedSkillId, message } = req.body;
    
    // Check if user is trying to swap with themselves
    if (receiverId === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'You cannot create a swap request with yourself'
      });
    }
    
    // Check if receiver exists
    const receiver = await userModel.getUserById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        error: 'Receiver not found'
      });
    }
    
    // Check if offered skill belongs to sender
    const offeredSkills = await skillModel.getUserOfferedSkills(req.user.id);
    const hasOfferedSkill = offeredSkills.some(skill => skill.id === offeredSkillId);
    if (!hasOfferedSkill) {
      return res.status(400).json({
        success: false,
        error: 'Offered skill does not belong to you'
      });
    }
    
    // Check if wanted skill belongs to receiver
    const receiverOfferedSkills = await skillModel.getUserOfferedSkills(receiverId);
    const hasWantedSkill = receiverOfferedSkills.some(skill => skill.id === wantedSkillId);
    if (!hasWantedSkill) {
      return res.status(400).json({
        success: false,
        error: 'Wanted skill does not belong to receiver'
      });
    }
    
    // Create swap request
    const swapRequest = await swapModel.createSwapRequest({
      senderId: req.user.id,
      receiverId,
      offeredSkillId,
      wantedSkillId,
      message
    });
    
    res.status(201).json({
      success: true,
      data: swapRequest
    });
  } catch (err) {
    console.error('Error in createSwapRequest:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * @desc    Accept a swap request
 * @route   PUT /api/swaps/:id/accept
 * @access  Private
 */
exports.acceptSwapRequest = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Accept swap request
    try {
      const swap = await swapModel.acceptSwapRequest(id, req.user.id);
      
      res.status(200).json({
        success: true,
        data: swap
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
  } catch (err) {
    console.error('Error in acceptSwapRequest:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * @desc    Reject a swap request
 * @route   PUT /api/swaps/:id/reject
 * @access  Private
 */
exports.rejectSwapRequest = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Reject swap request
    try {
      const swap = await swapModel.rejectSwapRequest(id, req.user.id);
      
      res.status(200).json({
        success: true,
        data: swap
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
  } catch (err) {
    console.error('Error in rejectSwapRequest:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * @desc    Delete a swap request
 * @route   DELETE /api/swaps/:id
 * @access  Private
 */
exports.deleteSwapRequest = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete swap request
    try {
      const success = await swapModel.deleteSwapRequest(id, req.user.id);
      
      res.status(200).json({
        success: true,
        data: {
          message: 'Swap request deleted successfully'
        }
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
  } catch (err) {
    console.error('Error in deleteSwapRequest:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * @desc    Add feedback for a completed swap
 * @route   POST /api/swaps/:id/feedback
 * @access  Private
 */
exports.addFeedback = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    const { id } = req.params;
    const { rating, comment } = req.body;
    
    // Add feedback
    try {
      const feedback = await swapModel.addFeedback(id, req.user.id, rating, comment);
      
      res.status(201).json({
        success: true,
        data: feedback
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
  } catch (err) {
    console.error('Error in addFeedback:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * @desc    Complete a swap request
 * @route   PUT /api/swaps/:id/complete
 * @access  Private
 */
exports.completeSwapRequest = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Complete swap request
    try {
      const swap = await swapModel.completeSwapRequest(id, req.user.id);
      
      res.status(200).json({
        success: true,
        data: swap
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
  } catch (err) {
    console.error('Error in completeSwapRequest:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};