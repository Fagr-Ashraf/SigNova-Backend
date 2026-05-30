const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");

const SALT_ROUNDS = 12;

/* ================= TOKENS ================= */

function signAccessToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");

  return jwt.sign(
    {
      sub: user._id.toString(),
      username: user.username,
    },
    secret,
    { expiresIn: "15m" } // access token short
  );
}

function signRefreshToken(user) {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error("JWT_REFRESH_SECRET is not configured");

  return jwt.sign(
    {
      sub: user._id.toString(),
    },
    secret,
    { expiresIn: "7d" }
  );
}

/* ================= SIGNUP ================= */

async function signup(payload) {
  const existingUsername = await User.findOne({
    username: payload.username.toLowerCase().trim(),
  });

  if (existingUsername) {
    const err = new Error("Username already taken");
    err.statusCode = 409;
    throw err;
  }

  const existingEmail = await User.findOne({
    email: payload.email.toLowerCase().trim(),
  });

  if (existingEmail) {
    const err = new Error("Email already registered");
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);

  const user = await User.create({
    username: payload.username.toLowerCase().trim(),
    email: payload.email.toLowerCase().trim(),
    phone: payload.phone.trim(),
    password: passwordHash,
    dob: payload.dob || null,
    gender: payload.gender || null,
    isDeaf: Boolean(payload.isDeaf),
    avatar: payload.avatar || null,
  });

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

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

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  user.refreshToken = refreshToken;

  await user.save(); // ✔ SAFE NOW

  return {
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      dob: user.dob,
      gender: user.gender,
      isDeaf: user.isDeaf,
      avatar: user.avatar,
      createdAt: user.createdAt,
    },
    accessToken,
    refreshToken,
  };
}
/* ================= GOOGLE LOGIN ================= */

async function loginWithGoogle({ idToken }) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    const err = new Error("Google OAuth is not configured");
    err.statusCode = 503;
    throw err;
  }

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
    const baseUsername = (payload.email.split("@")[0] || "user")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "");

    let username = baseUsername.slice(0, 32) || "user";
    let suffix = 0;

    while (await User.findOne({ username })) {
      suffix += 1;
      username = `${baseUsername}${suffix}`.slice(0, 32);
    }

    const randomPassword = await bcrypt.hash(
      `${payload.sub}:${Date.now()}`,
      SALT_ROUNDS
    );

    user = await User.create({
      username,
      email,
      phone: payload.phone ? String(payload.phone) : "-",
      password: randomPassword,
      dob: null,
      gender: null,
      isDeaf: false,
      avatar: payload.picture || null,
    });
  } else if (payload.picture && !user.avatar) {
    user.avatar = payload.picture;
    await user.save();
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  user.refreshToken = refreshToken;
  await user.save();

  return { user, accessToken, refreshToken };
}

/* ================= REFRESH ================= */

async function refresh(refreshToken) {
  if (!refreshToken) {
    const err = new Error("Refresh token required");
    err.statusCode = 401;
    throw err;
  }

  const user = await User.findOne({ refreshToken });

  if (!user) {
    const err = new Error("Invalid refresh token");
    err.statusCode = 403;
    throw err;
  }

  const secret = process.env.JWT_REFRESH_SECRET;

  jwt.verify(refreshToken, secret);

  const newAccessToken = signAccessToken(user);

  return { accessToken: newAccessToken };
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

/* ================= HELPERS ================= */

function verifyJwt(token) {
  const secret = process.env.JWT_SECRET;
  return jwt.verify(token, secret);
}

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