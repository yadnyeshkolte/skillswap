/**
 * Swap request routes for Skill Swap Platform
 */
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');

// Import controllers
// Note: These controller files will be created later
const { 
  getSwapRequests,
  getSwapRequestById,
  createSwapRequest,
  acceptSwapRequest,
  rejectSwapRequest,
  deleteSwapRequest,
  addFeedback
} = require('../controllers/swap.controller');

// Import middleware
const { protect, authorize } = require('../middleware/auth.middleware');

// @route   GET /api/swaps
// @desc    Get all swap requests for the current user
// @access  Private
router.get('/', protect, getSwapRequests);

// @route   GET /api/swaps/:id
// @desc    Get swap request by ID
// @access  Private
router.get('/:id', protect, getSwapRequestById);

// @route   POST /api/swaps
// @desc    Create a new swap request
// @access  Private
router.post(
  '/',
  [
    check('receiverId', 'Receiver ID is required').not().isEmpty(),
    check('offeredSkillId', 'Offered skill ID is required').not().isEmpty(),
    check('wantedSkillId', 'Wanted skill ID is required').not().isEmpty(),
    check('message', 'Message is required').optional()
  ],
  protect,
  createSwapRequest
);

// @route   PUT /api/swaps/:id/accept
// @desc    Accept a swap request
// @access  Private
router.put('/:id/accept', protect, acceptSwapRequest);

// @route   PUT /api/swaps/:id/reject
// @desc    Reject a swap request
// @access  Private
router.put('/:id/reject', protect, rejectSwapRequest);

// @route   DELETE /api/swaps/:id
// @desc    Delete a swap request
// @access  Private
router.delete('/:id', protect, deleteSwapRequest);

// @route   POST /api/swaps/:id/feedback
// @desc    Add feedback for a completed swap
// @access  Private
router.post(
  '/:id/feedback',
  [
    check('rating', 'Rating is required and must be between 1 and 5').isInt({ min: 1, max: 5 }),
    check('comment', 'Comment is required').optional()
  ],
  protect,
  addFeedback
);

module.exports = router;