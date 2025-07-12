/**
 * Swap request model for Skill Swap Platform
 */
const { execute } = require('../config/db');
const crypto = require('crypto');
const oracledb = require('oracledb');

/**
 * Get swap requests for a user
 * @param {string} userId - User ID
 * @param {Object} options - Filter options
 * @returns {Promise<Object>} - Swap requests and pagination info
 */
exports.getSwapRequests = async (userId, options = {}) => {
  try {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;
    const status = options.status || null;
    
    let query = `
      SELECT sr.id, sr.sender_id, sr.receiver_id, sr.offered_skill_id, 
             sr.wanted_skill_id, sr.message, sr.status, sr.created_at, sr.updated_at,
             sender.name as sender_name, sender.profile_photo as sender_photo,
             receiver.name as receiver_name, receiver.profile_photo as receiver_photo,
             offered.name as offered_skill_name, wanted.name as wanted_skill_name
      FROM swap_requests sr
      JOIN users sender ON sr.sender_id = sender.id
      JOIN users receiver ON sr.receiver_id = receiver.id
      JOIN skills offered ON sr.offered_skill_id = offered.id
      JOIN skills wanted ON sr.wanted_skill_id = wanted.id
      WHERE (sr.sender_id = :userId OR sr.receiver_id = :userId)
    `;
    
    const binds = { userId, offset, limit };
    
    // Add status filter if provided
    if (status) {
      query += ` AND sr.status = :status`;
      binds.status = status;
    }
    
    // Add sorting and pagination
    query += `
      ORDER BY sr.created_at DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `;
    
    const result = await execute(query, binds);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM swap_requests sr
      WHERE (sr.sender_id = :userId OR sr.receiver_id = :userId)
    `;
    
    if (status) {
      countQuery += ` AND sr.status = :status`;
    }
    
    const countResult = await execute(countQuery, binds);
    const total = countResult.rows[0].TOTAL;
    
    return {
      swapRequests: result.rows.map(swap => ({
        id: swap.ID,
        senderId: swap.SENDER_ID,
        senderName: swap.SENDER_NAME,
        senderPhoto: swap.SENDER_PHOTO,
        receiverId: swap.RECEIVER_ID,
        receiverName: swap.RECEIVER_NAME,
        receiverPhoto: swap.RECEIVER_PHOTO,
        offeredSkillId: swap.OFFERED_SKILL_ID,
        offeredSkillName: swap.OFFERED_SKILL_NAME,
        wantedSkillId: swap.WANTED_SKILL_ID,
        wantedSkillName: swap.WANTED_SKILL_NAME,
        message: swap.MESSAGE,
        status: swap.STATUS,
        createdAt: swap.CREATED_AT,
        updatedAt: swap.UPDATED_AT,
        isUserSender: swap.SENDER_ID === userId
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (err) {
    console.error('Error getting swap requests:', err);
    throw err;
  }
};

/**
 * Get all swap requests (admin only)
 * @param {Object} options - Filter options
 * @returns {Promise<Object>} - Swap requests and pagination info
 */
exports.getAllSwapRequests = async (options = {}) => {
  try {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;
    const status = options.status || null;
    const userId = options.userId || null;
    
    let query = `
      SELECT sr.id, sr.sender_id, sr.receiver_id, sr.offered_skill_id, 
             sr.wanted_skill_id, sr.message, sr.status, sr.created_at, sr.updated_at,
             sender.name as sender_name, sender.profile_photo as sender_photo,
             receiver.name as receiver_name, receiver.profile_photo as receiver_photo,
             offered.name as offered_skill_name, wanted.name as wanted_skill_name
      FROM swap_requests sr
      JOIN users sender ON sr.sender_id = sender.id
      JOIN users receiver ON sr.receiver_id = receiver.id
      JOIN skills offered ON sr.offered_skill_id = offered.id
      JOIN skills wanted ON sr.wanted_skill_id = wanted.id
      WHERE 1=1
    `;
    
    const binds = { offset, limit };
    
    // Add status filter if provided
    if (status) {
      query += ` AND sr.status = :status`;
      binds.status = status;
    }
    
    // Add user filter if provided
    if (userId) {
      query += ` AND (sr.sender_id = :userId OR sr.receiver_id = :userId)`;
      binds.userId = userId;
    }
    
    // Add sorting and pagination
    query += `
      ORDER BY sr.created_at DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `;
    
    const result = await execute(query, binds);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM swap_requests sr
      WHERE 1=1
    `;
    
    if (status) {
      countQuery += ` AND sr.status = :status`;
    }
    
    if (userId) {
      countQuery += ` AND (sr.sender_id = :userId OR sr.receiver_id = :userId)`;
    }
    
    const countResult = await execute(countQuery, binds);
    const total = countResult.rows[0].TOTAL;
    
    return {
      swapRequests: result.rows.map(swap => ({
        id: swap.ID,
        senderId: swap.SENDER_ID,
        senderName: swap.SENDER_NAME,
        senderPhoto: swap.SENDER_PHOTO,
        receiverId: swap.RECEIVER_ID,
        receiverName: swap.RECEIVER_NAME,
        receiverPhoto: swap.RECEIVER_PHOTO,
        offeredSkillId: swap.OFFERED_SKILL_ID,
        offeredSkillName: swap.OFFERED_SKILL_NAME,
        wantedSkillId: swap.WANTED_SKILL_ID,
        wantedSkillName: swap.WANTED_SKILL_NAME,
        message: swap.MESSAGE,
        status: swap.STATUS,
        createdAt: swap.CREATED_AT,
        updatedAt: swap.UPDATED_AT
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (err) {
    console.error('Error getting all swap requests:', err);
    throw err;
  }
};

/**
 * Get swap request by ID
 * @param {string} id - Swap request ID
 * @returns {Promise<Object>} - Swap request
 */
exports.getSwapRequestById = async (id) => {
  try {
    const query = `
      SELECT sr.id, sr.sender_id, sr.receiver_id, sr.offered_skill_id, 
             sr.wanted_skill_id, sr.message, sr.status, sr.created_at, sr.updated_at,
             sender.name as sender_name, sender.profile_photo as sender_photo,
             receiver.name as receiver_name, receiver.profile_photo as receiver_photo,
             offered.name as offered_skill_name, wanted.name as wanted_skill_name
      FROM swap_requests sr
      JOIN users sender ON sr.sender_id = sender.id
      JOIN users receiver ON sr.receiver_id = receiver.id
      JOIN skills offered ON sr.offered_skill_id = offered.id
      JOIN skills wanted ON sr.wanted_skill_id = wanted.id
      WHERE sr.id = :id
    `;
    
    const result = await execute(query, { id });
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const swap = result.rows[0];
    
    // Get feedback for this swap
    const feedbackQuery = `
      SELECT f.id, f.user_id, f.rating, f.comment, f.created_at,
             u.name as user_name, u.profile_photo as user_photo
      FROM feedback f
      JOIN users u ON f.user_id = u.id
      WHERE f.swap_id = :swapId
    `;
    
    const feedbackResult = await execute(feedbackQuery, { swapId: id });
    
    return {
      id: swap.ID,
      senderId: swap.SENDER_ID,
      senderName: swap.SENDER_NAME,
      senderPhoto: swap.SENDER_PHOTO,
      receiverId: swap.RECEIVER_ID,
      receiverName: swap.RECEIVER_NAME,
      receiverPhoto: swap.RECEIVER_PHOTO,
      offeredSkillId: swap.OFFERED_SKILL_ID,
      offeredSkillName: swap.OFFERED_SKILL_NAME,
      wantedSkillId: swap.WANTED_SKILL_ID,
      wantedSkillName: swap.WANTED_SKILL_NAME,
      message: swap.MESSAGE,
      status: swap.STATUS,
      createdAt: swap.CREATED_AT,
      updatedAt: swap.UPDATED_AT,
      feedback: feedbackResult.rows.map(feedback => ({
        id: feedback.ID,
        userId: feedback.USER_ID,
        userName: feedback.USER_NAME,
        userPhoto: feedback.USER_PHOTO,
        rating: feedback.RATING,
        comment: feedback.COMMENT,
        createdAt: feedback.CREATED_AT
      }))
    };
  } catch (err) {
    console.error('Error getting swap request by ID:', err);
    throw err;
  }
};

/**
 * Create a new swap request
 * @param {Object} swapData - Swap request data
 * @returns {Promise<Object>} - Created swap request
 */
exports.createSwapRequest = async (swapData) => {
  try {
    // Generate UUID
    const id = crypto.randomUUID();
    
    // Insert swap request
    const query = `
      INSERT INTO swap_requests (
        id, sender_id, receiver_id, offered_skill_id, 
        wanted_skill_id, message, status
      ) VALUES (
        :id, :senderId, :receiverId, :offeredSkillId,
        :wantedSkillId, :message, 'pending'
      )
      RETURNING id INTO :id_out
    `;
    
    const binds = {
      id,
      senderId: swapData.senderId,
      receiverId: swapData.receiverId,
      offeredSkillId: swapData.offeredSkillId,
      wantedSkillId: swapData.wantedSkillId,
      message: swapData.message || null,
      id_out: { dir: oracledb.BIND_OUT, type: oracledb.STRING }
    };
    
    const result = await execute(query, binds);
    
    // Return created swap request
    return this.getSwapRequestById(result.outBinds.id_out[0]);
  } catch (err) {
    console.error('Error creating swap request:', err);
    throw err;
  }
};

/**
 * Update swap request status
 * @param {string} id - Swap request ID
 * @param {string} status - New status
 * @param {string} userId - User ID making the update
 * @returns {Promise<Object>} - Updated swap request
 */
exports.updateSwapRequestStatus = async (id, status, userId) => {
  try {
    // Validate status
    if (!['pending', 'accepted', 'rejected', 'completed'].includes(status)) {
      throw new Error('Invalid status. Must be "pending", "accepted", "rejected", or "completed".');
    }
    
    // Get swap request to check permissions
    const swap = await this.getSwapRequestById(id);
    
    if (!swap) {
      throw new Error('Swap request not found');
    }
    
    // Check if user is sender or receiver
    if (swap.senderId !== userId && swap.receiverId !== userId) {
      throw new Error('Not authorized to update this swap request');
    }
    
    // Only receiver can accept/reject
    if ((status === 'accepted' || status === 'rejected') && swap.receiverId !== userId) {
      throw new Error('Only the receiver can accept or reject a swap request');
    }
    
    // Only participants can mark as completed
    if (status === 'completed' && swap.senderId !== userId && swap.receiverId !== userId) {
      throw new Error('Only participants can mark a swap as completed');
    }
    
    // Update status
    const query = `
      UPDATE swap_requests
      SET status = :status, updated_at = CURRENT_TIMESTAMP
      WHERE id = :id
    `;
    
    await execute(query, { id, status });
    
    // Return updated swap request
    return this.getSwapRequestById(id);
  } catch (err) {
    console.error('Error updating swap request status:', err);
    throw err;
  }
};

/**
 * Accept a swap request
 * @param {string} id - Swap request ID
 * @param {string} userId - User ID (must be receiver)
 * @returns {Promise<Object>} - Updated swap request
 */
exports.acceptSwapRequest = async (id, userId) => {
  return this.updateSwapRequestStatus(id, 'accepted', userId);
};

/**
 * Reject a swap request
 * @param {string} id - Swap request ID
 * @param {string} userId - User ID (must be receiver)
 * @returns {Promise<Object>} - Updated swap request
 */
exports.rejectSwapRequest = async (id, userId) => {
  return this.updateSwapRequestStatus(id, 'rejected', userId);
};

/**
 * Complete a swap request
 * @param {string} id - Swap request ID
 * @param {string} userId - User ID (must be participant)
 * @returns {Promise<Object>} - Updated swap request
 */
exports.completeSwapRequest = async (id, userId) => {
  return this.updateSwapRequestStatus(id, 'completed', userId);
};

/**
 * Delete a swap request
 * @param {string} id - Swap request ID
 * @param {string} userId - User ID (must be sender)
 * @returns {Promise<boolean>} - Success status
 */
exports.deleteSwapRequest = async (id, userId) => {
  try {
    // Get swap request to check permissions
    const swap = await this.getSwapRequestById(id);
    
    if (!swap) {
      throw new Error('Swap request not found');
    }
    
    // Check if user is sender
    if (swap.senderId !== userId) {
      throw new Error('Only the sender can delete a swap request');
    }
    
    // Check if swap is in pending status
    if (swap.status !== 'pending') {
      throw new Error('Only pending swap requests can be deleted');
    }
    
    // Delete swap request
    const query = `
      DELETE FROM swap_requests
      WHERE id = :id
    `;
    
    const result = await execute(query, { id });
    
    return result.rowsAffected > 0;
  } catch (err) {
    console.error('Error deleting swap request:', err);
    throw err;
  }
};

/**
 * Add feedback for a completed swap
 * @param {string} swapId - Swap request ID
 * @param {string} userId - User ID (must be participant)
 * @param {number} rating - Rating (1-5)
 * @param {string} comment - Optional comment
 * @returns {Promise<Object>} - Created feedback
 */
exports.addFeedback = async (swapId, userId, rating, comment = null) => {
  try {
    // Get swap request to check permissions
    const swap = await this.getSwapRequestById(swapId);
    
    if (!swap) {
      throw new Error('Swap request not found');
    }
    
    // Check if user is participant
    if (swap.senderId !== userId && swap.receiverId !== userId) {
      throw new Error('Only participants can add feedback');
    }
    
    // Check if swap is completed
    if (swap.status !== 'completed') {
      throw new Error('Feedback can only be added to completed swaps');
    }
    
    // Check if user already left feedback
    const checkQuery = `
      SELECT id
      FROM feedback
      WHERE swap_id = :swapId AND user_id = :userId
    `;
    
    const checkResult = await execute(checkQuery, { swapId, userId });
    
    if (checkResult.rows.length > 0) {
      throw new Error('You have already left feedback for this swap');
    }
    
    // Generate UUID
    const id = crypto.randomUUID();
    
    // Insert feedback
    const query = `
      INSERT INTO feedback (id, swap_id, user_id, rating, comment)
      VALUES (:id, :swapId, :userId, :rating, :comment)
      RETURNING id INTO :id_out
    `;
    
    const binds = {
      id,
      swapId,
      userId,
      rating,
      comment,
      id_out: { dir: oracledb.BIND_OUT, type: oracledb.STRING }
    };
    
    const result = await execute(query, binds);
    
    // Get created feedback
    const feedbackQuery = `
      SELECT f.id, f.user_id, f.rating, f.comment, f.created_at,
             u.name as user_name, u.profile_photo as user_photo
      FROM feedback f
      JOIN users u ON f.user_id = u.id
      WHERE f.id = :id
    `;
    
    const feedbackResult = await execute(feedbackQuery, { id: result.outBinds.id_out[0] });
    
    if (feedbackResult.rows.length === 0) {
      throw new Error('Error retrieving created feedback');
    }
    
    const feedback = feedbackResult.rows[0];
    
    return {
      id: feedback.ID,
      userId: feedback.USER_ID,
      userName: feedback.USER_NAME,
      userPhoto: feedback.USER_PHOTO,
      rating: feedback.RATING,
      comment: feedback.COMMENT,
      createdAt: feedback.CREATED_AT
    };
  } catch (err) {
    console.error('Error adding feedback:', err);
    throw err;
  }
};

/**
 * Get user's feedback statistics
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Feedback statistics
 */
exports.getUserFeedbackStats = async (userId) => {
  try {
    const query = `
      SELECT 
        COUNT(f.id) as total_reviews,
        ROUND(AVG(f.rating), 1) as avg_rating,
        COUNT(CASE WHEN f.rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN f.rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN f.rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN f.rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN f.rating = 1 THEN 1 END) as one_star
      FROM feedback f
      JOIN swap_requests sr ON f.swap_id = sr.id
      WHERE sr.sender_id = :userId OR sr.receiver_id = :userId
    `;
    
    const result = await execute(query, { userId });
    
    if (result.rows.length === 0) {
      return {
        totalReviews: 0,
        avgRating: 0,
        fiveStar: 0,
        fourStar: 0,
        threeStar: 0,
        twoStar: 0,
        oneStar: 0
      };
    }
    
    const stats = result.rows[0];
    
    return {
      totalReviews: stats.TOTAL_REVIEWS,
      avgRating: stats.AVG_RATING || 0,
      fiveStar: stats.FIVE_STAR,
      fourStar: stats.FOUR_STAR,
      threeStar: stats.THREE_STAR,
      twoStar: stats.TWO_STAR,
      oneStar: stats.ONE_STAR
    };
  } catch (err) {
    console.error('Error getting user feedback stats:', err);
    throw err;
  }
};