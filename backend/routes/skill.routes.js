/**
 * Skill routes for Skill Swap Platform
 */
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');

// Import controllers
// Note: These controller files will be created later
const { 
  getSkills,
  addOfferedSkill,
  addWantedSkill,
  removeOfferedSkill,
  removeWantedSkill,
  searchSkills
} = require('../controllers/skill.controller');

// Import middleware
const { protect, authorize } = require('../middleware/auth.middleware');

// @route   GET /api/skills
// @desc    Get all skills (for dropdown lists, etc.)
// @access  Public
router.get('/', getSkills);

// @route   GET /api/skills/search
// @desc    Search skills (for filtering users)
// @access  Public
router.get('/search', searchSkills);

// @route   POST /api/skills/offered
// @desc    Add a skill to user's offered skills
// @access  Private
router.post(
  '/offered',
  [
    check('name', 'Skill name is required').not().isEmpty()
  ],
  protect,
  addOfferedSkill
);

// @route   POST /api/skills/wanted
// @desc    Add a skill to user's wanted skills
// @access  Private
router.post(
  '/wanted',
  [
    check('name', 'Skill name is required').not().isEmpty()
  ],
  protect,
  addWantedSkill
);

// @route   DELETE /api/skills/offered/:id
// @desc    Remove a skill from user's offered skills
// @access  Private
router.delete('/offered/:id', protect, removeOfferedSkill);

// @route   DELETE /api/skills/wanted/:id
// @desc    Remove a skill from user's wanted skills
// @access  Private
router.delete('/wanted/:id', protect, removeWantedSkill);

module.exports = router;