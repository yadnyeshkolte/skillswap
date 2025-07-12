/**
 * Admin controller for Skill Swap Platform
 */
const { validationResult } = require('express-validator');
const userModel = require('../models/user.model');
const skillModel = require('../models/skill.model');
const swapModel = require('../models/swap.model');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const oracledb = require('oracledb');

/**
 * @desc    Get all users (admin only)
 * @route   GET /api/admin/users
 * @access  Private
 */
exports.getUsers = async (req, res) => {
  try {
    const { search, page = 1, limit = 20, isBanned } = req.query;
    
    // Build filters object
    const filters = {};
    if (search) filters.search = search;
    if (isBanned !== undefined) filters.isBanned = isBanned === 'true';
    
    // Get users
    const result = await userModel.getUsers(filters, parseInt(page), parseInt(limit));
    
    res.status(200).json({
      success: true,
      data: result.users,
      pagination: result.pagination
    });
  } catch (err) {
    console.error('Error in admin getUsers:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * @desc    Get user by ID (admin only)
 * @route   GET /api/admin/users/:id
 * @access  Private
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get user with private info
    const user = await userModel.getUserById(id, true);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Get feedback stats
    const feedbackStats = await swapModel.getUserFeedbackStats(id);
    user.feedbackStats = feedbackStats;
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error('Error in admin getUserById:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * @desc    Ban a user
 * @route   PUT /api/admin/users/:id/ban
 * @access  Private
 */
exports.banUser = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    const { id } = req.params;
    const { reason } = req.body;
    
    // Check if user exists
    const user = await userModel.getUserById(id, true);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Check if user is already banned
    if (user.isBanned) {
      return res.status(400).json({
        success: false,
        error: 'User is already banned'
      });
    }
    
    // Check if trying to ban an admin
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Cannot ban an admin user'
      });
    }
    
    // Ban user
    const query = `
      UPDATE users
      SET is_banned = 1, ban_reason = :reason, updated_at = CURRENT_TIMESTAMP
      WHERE id = :id
    `;
    
    await userModel.execute(query, { id, reason });
    
    // Get updated user
    const updatedUser = await userModel.getUserById(id, true);
    
    res.status(200).json({
      success: true,
      data: updatedUser
    });
  } catch (err) {
    console.error('Error in banUser:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * @desc    Unban a user
 * @route   PUT /api/admin/users/:id/unban
 * @access  Private
 */
exports.unbanUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const user = await userModel.getUserById(id, true);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Check if user is not banned
    if (!user.isBanned) {
      return res.status(400).json({
        success: false,
        error: 'User is not banned'
      });
    }
    
    // Unban user
    const query = `
      UPDATE users
      SET is_banned = 0, ban_reason = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = :id
    `;
    
    await userModel.execute(query, { id });
    
    // Get updated user
    const updatedUser = await userModel.getUserById(id, true);
    
    res.status(200).json({
      success: true,
      data: updatedUser
    });
  } catch (err) {
    console.error('Error in unbanUser:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * @desc    Moderate a skill (approve/reject)
 * @route   PUT /api/admin/skills/:id/moderate
 * @access  Private
 */
exports.moderateSkill = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    const { id } = req.params;
    const { status, reason } = req.body;
    
    // Check if skill exists
    const skill = await skillModel.getSkillById(id);
    
    if (!skill) {
      return res.status(404).json({
        success: false,
        error: 'Skill not found'
      });
    }
    
    // Moderate skill
    const updatedSkill = await skillModel.moderateSkill(id, status, reason);
    
    res.status(200).json({
      success: true,
      data: updatedSkill
    });
  } catch (err) {
    console.error('Error in moderateSkill:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * @desc    Get all swap requests (admin only)
 * @route   GET /api/admin/swaps
 * @access  Private
 */
exports.getSwapRequests = async (req, res) => {
  try {
    const { status, userId, page = 1, limit = 20 } = req.query;
    
    // Build options object
    const options = {
      page: parseInt(page),
      limit: parseInt(limit)
    };
    
    if (status) options.status = status;
    if (userId) options.userId = userId;
    
    // Get all swap requests
    const result = await swapModel.getAllSwapRequests(options);
    
    res.status(200).json({
      success: true,
      data: result.swapRequests,
      pagination: result.pagination
    });
  } catch (err) {
    console.error('Error in admin getSwapRequests:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * @desc    Send platform-wide message
 * @route   POST /api/admin/messages
 * @access  Private
 */
exports.sendPlatformMessage = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    const { title, message, type } = req.body;
    
    // Generate UUID
    const id = crypto.randomUUID();
    
    // Insert message
    const query = `
      INSERT INTO platform_messages (id, title, message, type, created_by)
      VALUES (:id, :title, :message, :type, :createdBy)
      RETURNING id, title, message, type, created_at INTO :id_out, :title_out, :message_out, :type_out, :created_at_out
    `;
    
    const binds = {
      id,
      title,
      message,
      type,
      createdBy: req.user.id,
      id_out: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
      title_out: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
      message_out: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
      type_out: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
      created_at_out: { dir: oracledb.BIND_OUT, type: oracledb.DATE }
    };
    
    const result = await userModel.execute(query, binds);
    
    // Create user message status entries for all users
    const usersQuery = `
      SELECT id FROM users
    `;
    
    const usersResult = await userModel.execute(usersQuery);
    
    // Batch insert user message status entries
    for (const user of usersResult.rows) {
      const statusId = crypto.randomUUID();
      const statusQuery = `
        INSERT INTO user_message_status (id, user_id, message_id, is_read)
        VALUES (:id, :userId, :messageId, 0)
      `;
      
      await userModel.execute(statusQuery, {
        id: statusId,
        userId: user.ID,
        messageId: id
      });
    }
    
    res.status(201).json({
      success: true,
      data: {
        id: result.outBinds.id_out[0],
        title: result.outBinds.title_out[0],
        message: result.outBinds.message_out[0],
        type: result.outBinds.type_out[0],
        createdAt: result.outBinds.created_at_out[0]
      }
    });
  } catch (err) {
    console.error('Error in sendPlatformMessage:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * @desc    Generate user activity report
 * @route   GET /api/admin/reports/users
 * @access  Private
 */
exports.generateUserReport = async (req, res) => {
  try {
    // Get user statistics
    const query = `
      SELECT
        COUNT(*) as total_users,
        SUM(CASE WHEN is_banned = 1 THEN 1 ELSE 0 END) as banned_users,
        SUM(CASE WHEN is_public = 1 THEN 1 ELSE 0 END) as public_profiles,
        SUM(CASE WHEN is_public = 0 THEN 1 ELSE 0 END) as private_profiles,
        COUNT(CASE WHEN created_at > SYSDATE - 30 THEN 1 END) as new_users_last_30_days
      FROM users
    `;
    
    const result = await userModel.execute(query);
    
    // Get skill statistics
    const skillQuery = `
      SELECT
        COUNT(*) as total_skills,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_skills,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_skills,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_skills
      FROM skills
    `;
    
    const skillResult = await userModel.execute(skillQuery);
    
    // Get most offered skills
    const offeredSkillsQuery = `
      SELECT s.name, COUNT(*) as count
      FROM user_skills_offered uso
      JOIN skills s ON uso.skill_id = s.id
      GROUP BY s.name
      ORDER BY count DESC
      FETCH FIRST 10 ROWS ONLY
    `;
    
    const offeredSkillsResult = await userModel.execute(offeredSkillsQuery);
    
    // Get most wanted skills
    const wantedSkillsQuery = `
      SELECT s.name, COUNT(*) as count
      FROM user_skills_wanted usw
      JOIN skills s ON usw.skill_id = s.id
      GROUP BY s.name
      ORDER BY count DESC
      FETCH FIRST 10 ROWS ONLY
    `;
    
    const wantedSkillsResult = await userModel.execute(wantedSkillsQuery);
    
    res.status(200).json({
      success: true,
      data: {
        userStats: {
          totalUsers: result.rows[0].TOTAL_USERS,
          bannedUsers: result.rows[0].BANNED_USERS,
          publicProfiles: result.rows[0].PUBLIC_PROFILES,
          privateProfiles: result.rows[0].PRIVATE_PROFILES,
          newUsersLast30Days: result.rows[0].NEW_USERS_LAST_30_DAYS
        },
        skillStats: {
          totalSkills: skillResult.rows[0].TOTAL_SKILLS,
          approvedSkills: skillResult.rows[0].APPROVED_SKILLS,
          pendingSkills: skillResult.rows[0].PENDING_SKILLS,
          rejectedSkills: skillResult.rows[0].REJECTED_SKILLS
        },
        topOfferedSkills: offeredSkillsResult.rows.map(skill => ({
          name: skill.NAME,
          count: skill.COUNT
        })),
        topWantedSkills: wantedSkillsResult.rows.map(skill => ({
          name: skill.NAME,
          count: skill.COUNT
        }))
      }
    });
  } catch (err) {
    console.error('Error in generateUserReport:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * @desc    Generate swap statistics report
 * @route   GET /api/admin/reports/swaps
 * @access  Private
 */
exports.generateSwapReport = async (req, res) => {
  try {
    // Get swap statistics
    const query = `
      SELECT
        COUNT(*) as total_swaps,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_swaps,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted_swaps,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_swaps,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_swaps,
        COUNT(CASE WHEN created_at > SYSDATE - 30 THEN 1 END) as new_swaps_last_30_days
      FROM swap_requests
    `;
    
    const result = await userModel.execute(query);
    
    // Get monthly swap statistics for the last 6 months
    const monthlyQuery = `
      SELECT
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM swap_requests
      WHERE created_at > SYSDATE - 180
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month
    `;
    
    const monthlyResult = await userModel.execute(monthlyQuery);
    
    res.status(200).json({
      success: true,
      data: {
        swapStats: {
          totalSwaps: result.rows[0].TOTAL_SWAPS,
          pendingSwaps: result.rows[0].PENDING_SWAPS,
          acceptedSwaps: result.rows[0].ACCEPTED_SWAPS,
          rejectedSwaps: result.rows[0].REJECTED_SWAPS,
          completedSwaps: result.rows[0].COMPLETED_SWAPS,
          newSwapsLast30Days: result.rows[0].NEW_SWAPS_LAST_30_DAYS
        },
        monthlyStats: monthlyResult.rows.map(month => ({
          month: month.MONTH,
          total: month.TOTAL,
          completed: month.COMPLETED
        }))
      }
    });
  } catch (err) {
    console.error('Error in generateSwapReport:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * @desc    Generate feedback logs report
 * @route   GET /api/admin/reports/feedback
 * @access  Private
 */
exports.generateFeedbackReport = async (req, res) => {
  try {
    // Get feedback statistics
    const query = `
      SELECT
        COUNT(*) as total_feedback,
        ROUND(AVG(rating), 2) as avg_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
      FROM feedback
    `;
    
    const result = await userModel.execute(query);
    
    // Get recent feedback
    const recentQuery = `
      SELECT
        f.id, f.rating, f.comment, f.created_at,
        u.id as user_id, u.name as user_name,
        sr.id as swap_id
      FROM feedback f
      JOIN users u ON f.user_id = u.id
      JOIN swap_requests sr ON f.swap_id = sr.id
      ORDER BY f.created_at DESC
      FETCH FIRST 20 ROWS ONLY
    `;
    
    const recentResult = await userModel.execute(recentQuery);
    
    res.status(200).json({
      success: true,
      data: {
        feedbackStats: {
          totalFeedback: result.rows[0].TOTAL_FEEDBACK,
          avgRating: result.rows[0].AVG_RATING,
          fiveStar: result.rows[0].FIVE_STAR,
          fourStar: result.rows[0].FOUR_STAR,
          threeStar: result.rows[0].THREE_STAR,
          twoStar: result.rows[0].TWO_STAR,
          oneStar: result.rows[0].ONE_STAR
        },
        recentFeedback: recentResult.rows.map(feedback => ({
          id: feedback.ID,
          rating: feedback.RATING,
          comment: feedback.COMMENT,
          createdAt: feedback.CREATED_AT,
          userId: feedback.USER_ID,
          userName: feedback.USER_NAME,
          swapId: feedback.SWAP_ID
        }))
      }
    });
  } catch (err) {
    console.error('Error in generateFeedbackReport:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};