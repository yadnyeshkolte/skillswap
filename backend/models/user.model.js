/**
 * User model for Skill Swap Platform
 */
const { execute } = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const oracledb = require('oracledb');

/**
 * Get all users with filtering options
 * @param {Object} filters - Filtering options (skills, availability, search term)
 * @param {number} page - Page number
 * @param {number} limit - Number of users per page
 * @returns {Promise<Object>} - Users and pagination info
 */
exports.getUsers = async (filters = {}, page = 1, limit = 10) => {
  try {
    const offset = (page - 1) * limit;
    let query = `
      SELECT u.id, u.name, u.location, u.availability, u.profile_photo,
             CASE WHEN AVG(f.rating) IS NULL THEN 0 ELSE ROUND(AVG(f.rating), 1) END as avg_rating,
             COUNT(DISTINCT f.id) as review_count
      FROM users u
      LEFT JOIN swap_requests sr ON (u.id = sr.sender_id OR u.id = sr.receiver_id)
      LEFT JOIN feedback f ON (sr.id = f.swap_id)
      WHERE u.is_banned = 0 AND u.is_public = 1
    `;

    const binds = {};

    // Add skill filter if provided
    if (filters.skill) {
      query += `
        AND (
          EXISTS (
            SELECT 1 FROM user_skills_offered uso
            JOIN skills s ON uso.skill_id = s.id
            WHERE uso.user_id = u.id AND LOWER(s.name) LIKE LOWER(:skill)
          )
          OR
          EXISTS (
            SELECT 1 FROM user_skills_wanted usw
            JOIN skills s ON usw.skill_id = s.id
            WHERE usw.user_id = u.id AND LOWER(s.name) LIKE LOWER(:skill)
          )
        )
      `;
      binds.skill = `%${filters.skill}%`;
    }

    // Add availability filter if provided
    if (filters.availability) {
      query += ` AND LOWER(u.availability) LIKE LOWER(:availability)`;
      binds.availability = `%${filters.availability}%`;
    }

    // Add search term filter if provided
    if (filters.search) {
      query += ` AND (LOWER(u.name) LIKE LOWER(:search) OR LOWER(u.location) LIKE LOWER(:search))`;
      binds.search = `%${filters.search}%`;
    }

    // Group by user and add pagination
    query += `
      GROUP BY u.id, u.name, u.location, u.availability, u.profile_photo
      ORDER BY u.name
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `;

    binds.offset = offset;
    binds.limit = limit;

    // Execute query
    const result = await execute(query, binds);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      WHERE u.is_banned = 0 AND u.is_public = 1
    `;

    // Add filters to count query
    if (filters.skill) {
      countQuery += `
        AND (
          EXISTS (
            SELECT 1 FROM user_skills_offered uso
            JOIN skills s ON uso.skill_id = s.id
            WHERE uso.user_id = u.id AND LOWER(s.name) LIKE LOWER(:skill)
          )
          OR
          EXISTS (
            SELECT 1 FROM user_skills_wanted usw
            JOIN skills s ON usw.skill_id = s.id
            WHERE usw.user_id = u.id AND LOWER(s.name) LIKE LOWER(:skill)
          )
        )
      `;
    }

    if (filters.availability) {
      countQuery += ` AND LOWER(u.availability) LIKE LOWER(:availability)`;
    }

    if (filters.search) {
      countQuery += ` AND (LOWER(u.name) LIKE LOWER(:search) OR LOWER(u.location) LIKE LOWER(:search))`;
    }

    const countResult = await execute(countQuery, binds);
    const total = countResult.rows[0].TOTAL;

    // Get skills for each user
    const users = await Promise.all(
      result.rows.map(async (user) => {
        // Get offered skills
        const offeredSkillsQuery = `
          SELECT s.id, s.name
          FROM user_skills_offered uso
          JOIN skills s ON uso.skill_id = s.id
          WHERE uso.user_id = :userId AND s.status = 'approved'
        `;

        const offeredSkillsResult = await execute(offeredSkillsQuery, { userId: user.ID });

        // Get wanted skills
        const wantedSkillsQuery = `
          SELECT s.id, s.name
          FROM user_skills_wanted usw
          JOIN skills s ON usw.skill_id = s.id
          WHERE usw.user_id = :userId AND s.status = 'approved'
        `;

        const wantedSkillsResult = await execute(wantedSkillsQuery, { userId: user.ID });

        return {
          id: user.ID,
          name: user.NAME,
          location: user.LOCATION,
          availability: user.AVAILABILITY,
          profilePhoto: user.PROFILE_PHOTO,
          avgRating: user.AVG_RATING,
          reviewCount: user.REVIEW_COUNT,
          offeredSkills: offeredSkillsResult.rows.map(skill => ({
            id: skill.ID,
            name: skill.NAME
          })),
          wantedSkills: wantedSkillsResult.rows.map(skill => ({
            id: skill.ID,
            name: skill.NAME
          }))
        };
      })
    );

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (err) {
    console.error('Error getting users:', err);
    throw err;
  }
};

/**
 * Get user by ID
 * @param {string} id - User ID
 * @param {boolean} includePrivate - Whether to include private profile info
 * @returns {Promise<Object>} - User object
 */
exports.getUserById = async (id, includePrivate = false) => {
  try {
    // Get basic user info
    const query = `
      SELECT u.id, u.name, u.email, u.location, u.availability, u.profile_photo, 
             u.is_public, u.role, u.created_at,
             CASE WHEN AVG(f.rating) IS NULL THEN 0 ELSE ROUND(AVG(f.rating), 1) END as avg_rating,
             COUNT(DISTINCT f.id) as review_count
      FROM users u
      LEFT JOIN swap_requests sr ON (u.id = sr.sender_id OR u.id = sr.receiver_id)
      LEFT JOIN feedback f ON (sr.id = f.swap_id)
      WHERE u.id = :id AND u.is_banned = 0
      GROUP BY u.id, u.name, u.email, u.location, u.availability, u.profile_photo, 
               u.is_public, u.role, u.created_at
    `;

    const result = await execute(query, { id });

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];

    // Check if profile is private and requester doesn't have access
    if (!user.IS_PUBLIC && !includePrivate) {
      return {
        id: user.ID,
        name: user.NAME,
        isPublic: user.IS_PUBLIC
      };
    }

    // Get offered skills
    const offeredSkillsQuery = `
      SELECT s.id, s.name
      FROM user_skills_offered uso
      JOIN skills s ON uso.skill_id = s.id
      WHERE uso.user_id = :userId AND s.status = 'approved'
    `;

    const offeredSkillsResult = await execute(offeredSkillsQuery, { userId: user.ID });

    // Get wanted skills
    const wantedSkillsQuery = `
      SELECT s.id, s.name
      FROM user_skills_wanted usw
      JOIN skills s ON usw.skill_id = s.id
      WHERE usw.user_id = :userId AND s.status = 'approved'
    `;

    const wantedSkillsResult = await execute(wantedSkillsQuery, { userId: user.ID });

    // Get feedback
    const feedbackQuery = `
      SELECT f.id, f.rating, f.comment, f.created_at,
             u.id as user_id, u.name as user_name
      FROM feedback f
      JOIN swap_requests sr ON f.swap_id = sr.id
      JOIN users u ON f.user_id = u.id
      WHERE (sr.sender_id = :userId OR sr.receiver_id = :userId)
      ORDER BY f.created_at DESC
    `;

    const feedbackResult = await execute(feedbackQuery, { userId: user.ID });

    return {
      id: user.ID,
      name: user.NAME,
      email: includePrivate ? user.EMAIL : undefined,
      location: user.LOCATION,
      availability: user.AVAILABILITY,
      profilePhoto: user.PROFILE_PHOTO,
      isPublic: user.IS_PUBLIC === 1,
      role: includePrivate ? user.ROLE : undefined,
      createdAt: user.CREATED_AT,
      avgRating: user.AVG_RATING,
      reviewCount: user.REVIEW_COUNT,
      offeredSkills: offeredSkillsResult.rows.map(skill => ({
        id: skill.ID,
        name: skill.NAME
      })),
      wantedSkills: wantedSkillsResult.rows.map(skill => ({
        id: skill.ID,
        name: skill.NAME
      })),
      feedback: feedbackResult.rows.map(feedback => ({
        id: feedback.ID,
        rating: feedback.RATING,
        comment: feedback.COMMENT,
        createdAt: feedback.CREATED_AT,
        user: {
          id: feedback.USER_ID,
          name: feedback.USER_NAME
        }
      }))
    };
  } catch (err) {
    console.error('Error getting user by ID:', err);
    throw err;
  }
};

/**
 * Create a new user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} - Created user
 */
exports.createUser = async (userData) => {
  try {
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    // Generate UUID
    const id = crypto.randomUUID();

    // Insert user
    const query = `
      INSERT INTO users (
        id, name, email, password, location, availability, 
        profile_photo, is_public, role
      ) VALUES (
        :id, :name, :email, :password, :location, :availability,
        :profilePhoto, :isPublic, :role
      )
      RETURNING id, name, email, role INTO :id_out, :name_out, :email_out, :role_out
    `;

    const binds = {
      id,
      name: userData.name,
      email: userData.email.toLowerCase(),
      password: hashedPassword,
      location: userData.location || null,
      availability: userData.availability || null,
      profilePhoto: userData.profilePhoto || null,
      isPublic: userData.isPublic === false ? 0 : 1,
      role: userData.role || 'user',
      id_out: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
      name_out: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
      email_out: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
      role_out: { dir: oracledb.BIND_OUT, type: oracledb.STRING }
    };

    const result = await execute(query, binds);

    return {
      id: result.outBinds.id_out[0],
      name: result.outBinds.name_out[0],
      email: result.outBinds.email_out[0],
      role: result.outBinds.role_out[0]
    };
  } catch (err) {
    console.error('Error creating user:', err);
    throw err;
  }
};

/**
 * Update user profile
 * @param {string} id - User ID
 * @param {Object} userData - User data to update
 * @returns {Promise<Object>} - Updated user
 */
exports.updateProfile = async (id, userData) => {
  try {
    // Build update query dynamically based on provided fields
    let updateFields = [];
    const binds = { id };

    if (userData.name !== undefined) {
      updateFields.push('name = :name');
      binds.name = userData.name;
    }

    if (userData.location !== undefined) {
      updateFields.push('location = :location');
      binds.location = userData.location || null;
    }

    if (userData.availability !== undefined) {
      updateFields.push('availability = :availability');
      binds.availability = userData.availability || null;
    }

    if (userData.profilePhoto !== undefined) {
      updateFields.push('profile_photo = :profilePhoto');
      binds.profilePhoto = userData.profilePhoto || null;
    }

    if (userData.isPublic !== undefined) {
      updateFields.push('is_public = :isPublic');
      binds.isPublic = userData.isPublic ? 1 : 0;
    }

    // If no fields to update, return user
    if (updateFields.length === 0) {
      return this.getUserById(id, true);
    }

    // Add updated_at timestamp
    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    // Execute update
    const query = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = :id
    `;

    await execute(query, binds);

    // Return updated user
    return this.getUserById(id, true);
  } catch (err) {
    console.error('Error updating user profile:', err);
    throw err;
  }
};

/**
 * Find user by email
 * @param {string} email - User email
 * @returns {Promise<Object>} - User object
 */
exports.findByEmail = async (email) => {
  try {
    const query = `
      SELECT id, name, email, password, role, is_banned, ban_reason
      FROM users
      WHERE LOWER(email) = LOWER(:email)
    `;

    const result = await execute(query, { email });

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];

    return {
      id: user.ID,
      name: user.NAME,
      email: user.EMAIL,
      password: user.PASSWORD,
      role: user.ROLE,
      isBanned: user.IS_BANNED === 1,
      banReason: user.BAN_REASON
    };
  } catch (err) {
    console.error('Error finding user by email:', err);
    throw err;
  }
};

/**
 * Update user password
 * @param {string} id - User ID
 * @param {string} password - New password
 * @returns {Promise<boolean>} - Success status
 */
exports.updatePassword = async (id, password) => {
  try {
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update password
    const query = `
      UPDATE users
      SET password = :password, updated_at = CURRENT_TIMESTAMP
      WHERE id = :id
    `;

    await execute(query, { id, password: hashedPassword });

    return true;
  } catch (err) {
    console.error('Error updating password:', err);
    throw err;
  }
};

/**
 * Set reset password token
 * @param {string} email - User email
 * @returns {Promise<string>} - Reset token
 */
exports.setResetPasswordToken = async (email) => {
  try {
    // Find user
    const user = await this.findByEmail(email);

    if (!user) {
      return null;
    }

    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expiration (10 minutes)
    const resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000);

    // Update user
    const query = `
      UPDATE users
      SET reset_password_token = :resetPasswordToken,
          reset_password_expire = :resetPasswordExpire,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = :id
    `;

    await execute(query, {
      id: user.id,
      resetPasswordToken,
      resetPasswordExpire
    });

    return resetToken;
  } catch (err) {
    console.error('Error setting reset password token:', err);
    throw err;
  }
};

/**
 * Reset password with token
 * @param {string} resetToken - Reset token
 * @param {string} password - New password
 * @returns {Promise<boolean>} - Success status
 */
exports.resetPassword = async (resetToken, password) => {
  try {
    // Hash token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Find user with valid token
    const query = `
      SELECT id
      FROM users
      WHERE reset_password_token = :resetPasswordToken
        AND reset_password_expire > CURRENT_TIMESTAMP
    `;

    const result = await execute(query, { resetPasswordToken });

    if (result.rows.length === 0) {
      return false;
    }

    const userId = result.rows[0].ID;

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update password and clear token
    const updateQuery = `
      UPDATE users
      SET password = :password,
          reset_password_token = NULL,
          reset_password_expire = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = :id
    `;

    await execute(updateQuery, { id: userId, password: hashedPassword });

    return true;
  } catch (err) {
    console.error('Error resetting password:', err);
    throw err;
  }
};

/**
 * Toggle profile visibility
 * @param {string} id - User ID
 * @returns {Promise<Object>} - Updated user
 */
exports.toggleProfileVisibility = async (id) => {
  try {
    const query = `
      UPDATE users
      SET is_public = CASE WHEN is_public = 1 THEN 0 ELSE 1 END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = :id
    `;

    await execute(query, { id });

    // Return updated user
    return this.getUserById(id, true);
  } catch (err) {
    console.error('Error toggling profile visibility:', err);
    throw err;
  }
};
