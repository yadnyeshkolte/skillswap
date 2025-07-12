/**
 * Skill controller for Skill Swap Platform
 */
const { validationResult } = require('express-validator');
const skillModel = require('../models/skill.model');

/**
 * @desc    Get all skills
 * @route   GET /api/skills
 * @access  Public
 */
exports.getSkills = async (req, res) => {
  try {
    const { search, page = 1, limit = 100, status = 'approved' } = req.query;
    
    // Build options object
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      status
    };
    
    if (search) options.search = search;
    
    // Get skills
    const result = await skillModel.getSkills(options);
    
    res.status(200).json({
      success: true,
      data: result.skills,
      pagination: result.pagination
    });
  } catch (err) {
    console.error('Error in getSkills:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * @desc    Search skills by name
 * @route   GET /api/skills/search
 * @access  Public
 */
exports.searchSkills = async (req, res) => {
  try {
    const { term, limit = 10 } = req.query;
    
    if (!term) {
      return res.status(400).json({
        success: false,
        error: 'Search term is required'
      });
    }
    
    // Search skills
    const skills = await skillModel.searchSkills(term, parseInt(limit));
    
    res.status(200).json({
      success: true,
      data: skills
    });
  } catch (err) {
    console.error('Error in searchSkills:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * @desc    Add a skill to user's offered skills
 * @route   POST /api/skills/offered
 * @access  Private
 */
exports.addOfferedSkill = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    const { name } = req.body;
    
    // Add skill to user's offered skills
    const skill = await skillModel.addOfferedSkill(req.user.id, name);
    
    // Get updated offered skills
    const offeredSkills = await skillModel.getUserOfferedSkills(req.user.id);
    
    res.status(200).json({
      success: true,
      data: {
        addedSkill: skill,
        offeredSkills
      }
    });
  } catch (err) {
    console.error('Error in addOfferedSkill:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * @desc    Add a skill to user's wanted skills
 * @route   POST /api/skills/wanted
 * @access  Private
 */
exports.addWantedSkill = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    const { name } = req.body;
    
    // Add skill to user's wanted skills
    const skill = await skillModel.addWantedSkill(req.user.id, name);
    
    // Get updated wanted skills
    const wantedSkills = await skillModel.getUserWantedSkills(req.user.id);
    
    res.status(200).json({
      success: true,
      data: {
        addedSkill: skill,
        wantedSkills
      }
    });
  } catch (err) {
    console.error('Error in addWantedSkill:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * @desc    Remove a skill from user's offered skills
 * @route   DELETE /api/skills/offered/:id
 * @access  Private
 */
exports.removeOfferedSkill = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Remove skill from user's offered skills
    const success = await skillModel.removeOfferedSkill(req.user.id, id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Skill not found in user\'s offered skills'
      });
    }
    
    // Get updated offered skills
    const offeredSkills = await skillModel.getUserOfferedSkills(req.user.id);
    
    res.status(200).json({
      success: true,
      data: {
        message: 'Skill removed from offered skills',
        offeredSkills
      }
    });
  } catch (err) {
    console.error('Error in removeOfferedSkill:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * @desc    Remove a skill from user's wanted skills
 * @route   DELETE /api/skills/wanted/:id
 * @access  Private
 */
exports.removeWantedSkill = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Remove skill from user's wanted skills
    const success = await skillModel.removeWantedSkill(req.user.id, id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Skill not found in user\'s wanted skills'
      });
    }
    
    // Get updated wanted skills
    const wantedSkills = await skillModel.getUserWantedSkills(req.user.id);
    
    res.status(200).json({
      success: true,
      data: {
        message: 'Skill removed from wanted skills',
        wantedSkills
      }
    });
  } catch (err) {
    console.error('Error in removeWantedSkill:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};