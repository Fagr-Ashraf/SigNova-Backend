const userService = require("../services/userService");
const { uploadAvatarBuffer } = require("../services/cloudinaryService");
const { sendSuccess, sendError } = require("../utils/apiResponse");

async function search(req, res, next) {
  try {
    const { username } = req.query;
    const results = await userService.searchByUsername(username || "", req.userId);
    return sendSuccess(res, { results }, "OK");
  } catch (e) {
    next(e);
  }
}

async function getProfile(req, res, next) {
  try {
    const profile = await userService.getProfileWithStats(req.userId);
    if (!profile) {
      return sendError(res, "User not found", null, 404);
    }
    return sendSuccess(res, { profile }, "OK");
  } catch (e) {
    next(e);
  }
}

async function updateProfile(req, res, next) {
  try {
    const updated = await userService.updateProfile(req.userId, req.body);
    if (!updated) {
      return sendError(res, "User not found", null, 404);
    }
    const profile = await userService.getProfileWithStats(req.userId);
    return sendSuccess(res, { profile }, "Profile updated");
  } catch (e) {
    next(e);
  }
}

async function uploadAvatar(req, res, next) {
  try {
    if (!req.file || !req.file.buffer) {
      return sendError(res, "Avatar file is required", null, 400);
    }
    const url = await uploadAvatarBuffer(req.file.buffer);
    const updated = await userService.updateProfile(req.userId, { avatar: url });
    if (!updated) {
      return sendError(res, "User not found", null, 404);
    }
    const profile = await userService.getProfileWithStats(req.userId);
    return sendSuccess(res, { profile, avatar: url }, "Avatar uploaded");
  } catch (e) {
    next(e);
  }
}

module.exports = { search, getProfile, updateProfile, uploadAvatar };
