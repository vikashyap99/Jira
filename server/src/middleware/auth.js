const jwt = require('jsonwebtoken');
const { failure } = require('../utils/apiResponse');
const env = require('../config/env');
const User = require('../models/User');

async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return failure(res, 'Authentication required', 401);
  }

  try {
    const decoded = jwt.verify(token, env.jwt.accessSecret);
    const user = await User.findById(decoded.sub).select('-refreshTokens -passwordHash');
    if (!user) {
      return failure(res, 'User no longer exists', 401);
    }
    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch (err) {
    return failure(res, 'Invalid or expired token', 401);
  }
}

module.exports = authenticate;
