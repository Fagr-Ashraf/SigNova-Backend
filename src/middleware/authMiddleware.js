const { verifyJwt } = require("../services/authService");
const User = require("../models/User");

async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      const err = new Error("Authentication required");
      err.statusCode = 401;
      throw err;
    }
    const decoded = verifyJwt(token);
    const user = await User.findById(decoded.sub).lean();
    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 401;
      throw err;
    }
    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch (e) {
    const status = e.statusCode || 401;
    const message = e.name === "JsonWebTokenError" ? "Invalid token" : e.message || "Unauthorized";
    return res.status(status).json({
      status: "error",
      session_id: null,
      data: {},
      message,
    });
  }
}

module.exports = { authRequired };
