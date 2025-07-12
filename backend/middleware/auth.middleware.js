/**
 * Authentication middleware for Skill Swap Platform
 */
const jwt = require('jsonwebtoken');
const { execute } = require('../config/db');

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  // Check if token exists in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  } 
  // Check if token exists in cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from the token
    const query = `
      SELECT id, name, email, role, is_banned
      FROM users
      WHERE id = :id
    `;

    const result = await execute(query, { id: decoded.id });
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = result.rows[0];

    // Check if user is banned
    if (user.IS_BANNED) {
      return res.status(403).json({
        success: false,
        error: 'Your account has been banned. Please contact support.'
      });
    }

    // Set user in request object
    req.user = {
      id: user.ID,
      name: user.NAME,
      email: user.EMAIL,
      role: user.ROLE
    };

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this route'
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(500).json({
        success: false,
        error: 'Authorization middleware error: User not found in request'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    
    next();
  };
};