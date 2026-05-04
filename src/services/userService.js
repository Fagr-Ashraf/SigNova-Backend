const mongoose = require("mongoose");
const User = require("../models/User");
const Message = require("../models/Message");
const ChatSession = require("../models/ChatSession");

async function searchByUsername(usernameQuery, excludeUserId = null) {
  if (!usernameQuery || typeof usernameQuery !== "string") {
    return [];
  }
  const q = usernameQuery.trim();
  if (!q) return [];
  const filter = {
    username: new RegExp(`^${escapeRegex(q)}`, "i"),
  };
  if (excludeUserId && mongoose.Types.ObjectId.isValid(excludeUserId)) {
    filter._id = { $ne: new mongoose.Types.ObjectId(String(excludeUserId)) };
  }
  const users = await User.find(filter)
    .limit(20)
    .select("username avatar")
    .lean();
  return users.map((u) => ({
    user_id: u._id.toString(),
    username: u.username,
    avatar: u.avatar,
  }));
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getProfileWithStats(userId) {
  const user = await User.findById(userId).lean();
  if (!user) return null;
  const sessions = await ChatSession.find({ participants: userId }).select("_id").lean();
  const sessionIds = sessions.map((s) => s._id);

  const [totalMessages, totalTranslations, totalMediaSent] = await Promise.all([
    Message.countDocuments({ sender_id: userId }),
    Message.countDocuments({
      session_id: { $in: sessionIds },
      type: { $in: ["translation_video", "translation_text"] },
    }),
    Message.countDocuments({
      sender_id: userId,
      type: { $in: ["image", "audio", "video"] },
    }),
  ]);

  return {
    user_id: user._id.toString(),
    username: user.username,
    email: user.email,
    phone: user.phone,
    dob: user.dob,
    gender: user.gender,
    isDeaf: user.isDeaf,
    avatar: user.avatar,
    stats: {
      totalMessages,
      totalTranslations,
      totalMediaSent,
    },
  };
}

async function updateProfile(userId, updates) {
  const allowed = ["username", "email", "phone", "dob", "gender", "isDeaf", "avatar"];
  const patch = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      patch[key] = updates[key];
    }
  }
  if (patch.username) {
    patch.username = String(patch.username).toLowerCase().trim();
    const taken = await User.findOne({ username: patch.username, _id: { $ne: userId } });
    if (taken) {
      const err = new Error("Username already taken");
      err.statusCode = 409;
      throw err;
    }
  }
  if (patch.email) {
    patch.email = String(patch.email).toLowerCase().trim();
    const taken = await User.findOne({ email: patch.email, _id: { $ne: userId } });
    if (taken) {
      const err = new Error("Email already registered");
      err.statusCode = 409;
      throw err;
    }
  }
  const user = await User.findByIdAndUpdate(userId, { $set: patch }, { new: true }).lean();
  return user;
}

module.exports = {
  searchByUsername,
  getProfileWithStats,
  updateProfile,
};
