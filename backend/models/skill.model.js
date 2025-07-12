/**
 * Skill model for Skill Swap Platform
 */
const { execute } = require('../config/db');
const crypto = require('crypto');
const oracledb = require('oracledb');

/**
 * Get all skills
 * @param {Object} options - Options for filtering and pagination
 * @returns {Promise<Object>} - Skills and pagination info
 */
exports.getSkills = async (options = {}) => {
  try {
    const page = options.page || 1;
    const limit = options.limit || 100;
    const offset = (page - 1) * limit;
    const status = options.status || 'approved';
    
    let query = `
      SELECT id, name, status, created_at
      FROM skills
      WHERE status = :status
    `;
    
    const binds = { status, offset, limit };
    
    // Add search filter if provided
    if (options.search) {
      query += ` AND LOWER(name) LIKE LOWER(:search)`;
      binds.search = `%${options.search}%`;
    }
    
    // Add sorting and pagination
    query += `
      ORDER BY name
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `;
    
    const result = await execute(query, binds);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM skills
      WHERE status = :status
    `;
    
    if (options.search) {
      countQuery += ` AND LOWER(name) LIKE LOWER(:search)`;
    }
    
    const countResult = await execute(countQuery, binds);
    const total = countResult.rows[0].TOTAL;
    
    return {
      skills: result.rows.map(skill => ({
        id: skill.ID,
        name: skill.NAME,
        status: skill.STATUS,
        createdAt: skill.CREATED_AT
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (err) {
    console.error('Error getting skills:', err);
    throw err;
  }
};

/**
 * Search skills by name
 * @param {string} term - Search term
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} - Matching skills
 */
exports.searchSkills = async (term, limit = 10) => {
  try {
    const query = `
      SELECT id, name
      FROM skills
      WHERE status = 'approved' AND LOWER(name) LIKE LOWER(:term)
      ORDER BY name
      FETCH FIRST :limit ROWS ONLY
    `;
    
    const result = await execute(query, { term: `%${term}%`, limit });
    
    return result.rows.map(skill => ({
      id: skill.ID,
      name: skill.NAME
    }));
  } catch (err) {
    console.error('Error searching skills:', err);
    throw err;
  }
};

/**
 * Get skill by ID
 * @param {string} id - Skill ID
 * @returns {Promise<Object>} - Skill object
 */
exports.getSkillById = async (id) => {
  try {
    const query = `
      SELECT id, name, status, rejection_reason, created_at, updated_at
      FROM skills
      WHERE id = :id
    `;
    
    const result = await execute(query, { id });
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const skill = result.rows[0];
    
    return {
      id: skill.ID,
      name: skill.NAME,
      status: skill.STATUS,
      rejectionReason: skill.REJECTION_REASON,
      createdAt: skill.CREATED_AT,
      updatedAt: skill.UPDATED_AT
    };
  } catch (err) {
    console.error('Error getting skill by ID:', err);
    throw err;
  }
};

/**
 * Get skill by name
 * @param {string} name - Skill name
 * @returns {Promise<Object>} - Skill object
 */
exports.getSkillByName = async (name) => {
  try {
    const query = `
      SELECT id, name, status, rejection_reason, created_at, updated_at
      FROM skills
      WHERE LOWER(name) = LOWER(:name)
    `;
    
    const result = await execute(query, { name });
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const skill = result.rows[0];
    
    return {
      id: skill.ID,
      name: skill.NAME,
      status: skill.STATUS,
      rejectionReason: skill.REJECTION_REASON,
      createdAt: skill.CREATED_AT,
      updatedAt: skill.UPDATED_AT
    };
  } catch (err) {
    console.error('Error getting skill by name:', err);
    throw err;
  }
};

/**
 * Create a new skill
 * @param {string} name - Skill name
 * @returns {Promise<Object>} - Created skill
 */
exports.createSkill = async (name) => {
  try {
    // Check if skill already exists
    const existingSkill = await this.getSkillByName(name);
    
    if (existingSkill) {
      return existingSkill;
    }
    
    // Generate UUID
    const id = crypto.randomUUID();
    
    // Insert skill
    const query = `
      INSERT INTO skills (id, name)
      VALUES (:id, :name)
      RETURNING id, name, status INTO :id_out, :name_out, :status_out
    `;
    
    const binds = {
      id,
      name: name.trim(),
      id_out: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
      name_out: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
      status_out: { dir: oracledb.BIND_OUT, type: oracledb.STRING }
    };
    
    const result = await execute(query, binds);
    
    return {
      id: result.outBinds.id_out[0],
      name: result.outBinds.name_out[0],
      status: result.outBinds.status_out[0]
    };
  } catch (err) {
    console.error('Error creating skill:', err);
    throw err;
  }
};

/**
 * Moderate a skill (approve or reject)
 * @param {string} id - Skill ID
 * @param {string} status - New status (approved or rejected)
 * @param {string} rejectionReason - Reason for rejection (required if status is 'rejected')
 * @returns {Promise<Object>} - Updated skill
 */
exports.moderateSkill = async (id, status, rejectionReason = null) => {
  try {
    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      throw new Error('Invalid status. Must be "approved" or "rejected".');
    }
    
    // Validate rejection reason
    if (status === 'rejected' && !rejectionReason) {
      throw new Error('Rejection reason is required when rejecting a skill.');
    }
    
    // Update skill
    const query = `
      UPDATE skills
      SET status = :status,
          rejection_reason = :rejectionReason,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = :id
    `;
    
    await execute(query, {
      id,
      status,
      rejectionReason: status === 'rejected' ? rejectionReason : null
    });
    
    // Return updated skill
    return this.getSkillById(id);
  } catch (err) {
    console.error('Error moderating skill:', err);
    throw err;
  }
};

/**
 * Get user's offered skills
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Offered skills
 */
exports.getUserOfferedSkills = async (userId) => {
  try {
    const query = `
      SELECT s.id, s.name, s.status
      FROM user_skills_offered uso
      JOIN skills s ON uso.skill_id = s.id
      WHERE uso.user_id = :userId
      ORDER BY s.name
    `;
    
    const result = await execute(query, { userId });
    
    return result.rows.map(skill => ({
      id: skill.ID,
      name: skill.NAME,
      status: skill.STATUS
    }));
  } catch (err) {
    console.error('Error getting user offered skills:', err);
    throw err;
  }
};

/**
 * Get user's wanted skills
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Wanted skills
 */
exports.getUserWantedSkills = async (userId) => {
  try {
    const query = `
      SELECT s.id, s.name, s.status
      FROM user_skills_wanted usw
      JOIN skills s ON usw.skill_id = s.id
      WHERE usw.user_id = :userId
      ORDER BY s.name
    `;
    
    const result = await execute(query, { userId });
    
    return result.rows.map(skill => ({
      id: skill.ID,
      name: skill.NAME,
      status: skill.STATUS
    }));
  } catch (err) {
    console.error('Error getting user wanted skills:', err);
    throw err;
  }
};

/**
 * Add a skill to user's offered skills
 * @param {string} userId - User ID
 * @param {string} skillName - Skill name
 * @returns {Promise<Object>} - Added skill
 */
exports.addOfferedSkill = async (userId, skillName) => {
  try {
    // Get or create skill
    const skill = await this.createSkill(skillName);
    
    // Check if user already has this skill
    const query = `
      SELECT id
      FROM user_skills_offered
      WHERE user_id = :userId AND skill_id = :skillId
    `;
    
    const result = await execute(query, { userId, skillId: skill.id });
    
    if (result.rows.length > 0) {
      return skill;
    }
    
    // Add skill to user's offered skills
    const id = crypto.randomUUID();
    
    const insertQuery = `
      INSERT INTO user_skills_offered (id, user_id, skill_id)
      VALUES (:id, :userId, :skillId)
    `;
    
    await execute(insertQuery, { id, userId, skillId: skill.id });
    
    return skill;
  } catch (err) {
    console.error('Error adding offered skill:', err);
    throw err;
  }
};

/**
 * Add a skill to user's wanted skills
 * @param {string} userId - User ID
 * @param {string} skillName - Skill name
 * @returns {Promise<Object>} - Added skill
 */
exports.addWantedSkill = async (userId, skillName) => {
  try {
    // Get or create skill
    const skill = await this.createSkill(skillName);
    
    // Check if user already has this skill
    const query = `
      SELECT id
      FROM user_skills_wanted
      WHERE user_id = :userId AND skill_id = :skillId
    `;
    
    const result = await execute(query, { userId, skillId: skill.id });
    
    if (result.rows.length > 0) {
      return skill;
    }
    
    // Add skill to user's wanted skills
    const id = crypto.randomUUID();
    
    const insertQuery = `
      INSERT INTO user_skills_wanted (id, user_id, skill_id)
      VALUES (:id, :userId, :skillId)
    `;
    
    await execute(insertQuery, { id, userId, skillId: skill.id });
    
    return skill;
  } catch (err) {
    console.error('Error adding wanted skill:', err);
    throw err;
  }
};

/**
 * Remove a skill from user's offered skills
 * @param {string} userId - User ID
 * @param {string} skillId - Skill ID
 * @returns {Promise<boolean>} - Success status
 */
exports.removeOfferedSkill = async (userId, skillId) => {
  try {
    const query = `
      DELETE FROM user_skills_offered
      WHERE user_id = :userId AND skill_id = :skillId
    `;
    
    const result = await execute(query, { userId, skillId });
    
    return result.rowsAffected > 0;
  } catch (err) {
    console.error('Error removing offered skill:', err);
    throw err;
  }
};

/**
 * Remove a skill from user's wanted skills
 * @param {string} userId - User ID
 * @param {string} skillId - Skill ID
 * @returns {Promise<boolean>} - Success status
 */
exports.removeWantedSkill = async (userId, skillId) => {
  try {
    const query = `
      DELETE FROM user_skills_wanted
      WHERE user_id = :userId AND skill_id = :skillId
    `;
    
    const result = await execute(query, { userId, skillId });
    
    return result.rowsAffected > 0;
  } catch (err) {
    console.error('Error removing wanted skill:', err);
    throw err;
  }
};