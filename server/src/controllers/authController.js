const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');
const { success, failure } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const emailService = require('../services/email');

function issueAccessToken(userId) {
  return jwt.sign({}, env.jwt.accessSecret, {
    subject: userId,
    expiresIn: env.jwt.accessExpiry,
  });
}

async function issueRefreshToken(userId) {
  const token = jwt.sign({}, env.jwt.refreshSecret, {
    subject: userId,
    expiresIn: env.jwt.refreshExpiry,
  });
  await User.updateOne(
    { _id: userId },
    { $push: { refreshTokens: { token, createdAt: new Date() } } }
  );
  return token;
}

const signup = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, phone } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    return failure(res, 'An account with this email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    email,
    passwordHash,
    firstName,
    lastName,
    phone,
  });

  const accessToken = issueAccessToken(user._id.toString());
  const refreshToken = await issueRefreshToken(user._id.toString());

  emailService.welcome({ to: user.email, user });

  return success(
    res,
    { user, accessToken, refreshToken },
    201
  );
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    return failure(res, 'Invalid email or password', 401);
  }

  const ok = await user.comparePassword(password);
  if (!ok) {
    return failure(res, 'Invalid email or password', 401);
  }

  const accessToken = issueAccessToken(user._id.toString());
  const refreshToken = await issueRefreshToken(user._id.toString());

  return success(res, { user, accessToken, refreshToken });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, env.jwt.refreshSecret);
  } catch {
    return failure(res, 'Invalid refresh token', 401);
  }

  const user = await User.findById(decoded.sub).select('+refreshTokens');
  if (!user) {
    return failure(res, 'User not found', 401);
  }

  const stored = user.refreshTokens.find((rt) => rt.token === refreshToken);
  if (!stored) {
    return failure(res, 'Refresh token not recognized', 401);
  }

  user.refreshTokens = user.refreshTokens.filter((rt) => rt.token !== refreshToken);
  await user.save();

  const accessToken = issueAccessToken(user._id.toString());
  const newRefreshToken = await issueRefreshToken(user._id.toString());

  return success(res, { user, accessToken, refreshToken: newRefreshToken });
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await User.updateOne(
      { _id: req.userId },
      { $pull: { refreshTokens: { token: refreshToken } } }
    );
  }
  return success(res, { message: 'Logged out' });
});

const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  return success(res, { user });
});

const updateMe = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, avatarUrl } = req.body;
  const update = {};
  if (firstName !== undefined) update.firstName = firstName;
  if (lastName !== undefined) update.lastName = lastName;
  if (phone !== undefined) update.phone = phone;
  if (avatarUrl !== undefined) update.avatarUrl = avatarUrl;

  const user = await User.findByIdAndUpdate(req.userId, update, { new: true });
  return success(res, { user });
});

module.exports = { signup, login, refresh, logout, me, updateMe };
