const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");

const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../utils/jwt");

const SALT_ROUNDS = 12;

/* ================= SIGNUP ================= */

async function signup(payload) {
  const username = payload.username.toLowerCase().trim();
  const email = payload.email.toLowerCase().trim();

  const existingUsername = await User.findOne({ username });
  if (existingUsername) {
    const err = new Error("Username already taken");
    err.statusCode = 409;
    throw err;
  }

  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    const err = new Error("Email already registered");
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);

  const user = await User.create({
    username,
    email,
    phone: payload.phone?.trim(),
    password: passwordHash,
    dob: payload.dob || null,
    gender: payload.gender || null,
    isDeaf: Boolean(payload.isDeaf),
    avatar: payload.avatar || null,
  });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshToken = refreshToken;
  await user.save();

  return { user, accessToken, refreshToken };
}

/* ================= LOGIN ================= */

async function login({ email, password }) {
  const user = await User.findOne({
    email: email.toLowerCase().trim(),
  }).select("+password");

  if (!user) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }

  const ok = await bcrypt.compare(password, user.password);

  if (!ok) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshToken = refreshToken;
  await user.save();

  return {
    user,
    accessToken,
    refreshToken,
  };
}

/* ================= GOOGLE LOGIN ================= */

async function loginWithGoogle({ idToken }) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("Google OAuth not configured");

  const client = new OAuth2Client(clientId);

  const ticket = await client
    .verifyIdToken({ idToken, audience: clientId })
    .catch(() => null);

  if (!ticket) {
    const err = new Error("Invalid Google token");
    err.statusCode = 401;
    throw err;
  }

  const payload = ticket.getPayload();
  const email = payload.email?.toLowerCase();

  if (!email) {
    const err = new Error("Google account has no email");
    err.statusCode = 400;
    throw err;
  }

  let user = await User.findOne({ email });

  if (!user) {
    const baseUsername = (email.split("@")[0] || "user")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "");

    let username = baseUsername.slice(0, 32);
    let suffix = 0;

    while (await User.findOne({ username })) {
      suffix++;
      username = `${baseUsername}${suffix}`.slice(0, 32);
    }

    user = await User.create({
      username,
      email,
      phone: "-",
      password: await bcrypt.hash(`${payload.sub}:${Date.now()}`, SALT_ROUNDS),
      avatar: payload.picture || null,
    });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshToken = refreshToken;
  await user.save();

  return { user, accessToken, refreshToken };
}

/* ================= REFRESH (ROTATION FIXED) ================= */

async function refresh(refreshToken) {
  if (!refreshToken) {
    const err = new Error("Refresh token required");
    err.statusCode = 401;
    throw err;
  }

  let decoded;

  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    const err = new Error("Invalid refresh token");
    err.statusCode = 403;
    throw err;
  }

  const user = await User.findById(decoded.id);

  if (!user || user.refreshToken !== refreshToken) {
    const err = new Error("Refresh token revoked");
    err.statusCode = 403;
    throw err;
  }

  // 🔁 ROTATION
  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);

  user.refreshToken = newRefreshToken;
  await user.save();

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

/* ================= LOGOUT ================= */

async function logout(refreshToken) {
  if (!refreshToken) return;

  const user = await User.findOne({ refreshToken });

  if (user) {
    user.refreshToken = null;
    await user.save();
  }
}

/* ================= JWT VERIFY ================= */

function verifyJwt(token) {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  return jwt.verify(token, secret);
}

/* ================= PUBLIC USER ================= */

function toPublicUser(user) {
  if (!user) return null;

  return {
    user_id: user._id.toString(),
    username: user.username,
    email: user.email,
    phone: user.phone,
    dob: user.dob,
    gender: user.gender,
    isDeaf: user.isDeaf,
    avatar: user.avatar,
    createdAt: user.createdAt,
  };
}

module.exports = {
  signup,
  login,
  loginWithGoogle,
  refresh,
  logout,
  verifyJwt,
  toPublicUser,
};