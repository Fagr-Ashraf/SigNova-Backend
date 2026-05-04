const mongoose = require("mongoose");

const DEV_FALLBACK_BOT_HEX = "507f1f77bcf86cd799439011";

function getBotUserId() {
  const fromEnv = process.env.BOT_USER_ID;
  if (fromEnv && mongoose.Types.ObjectId.isValid(fromEnv)) {
    return new mongoose.Types.ObjectId(fromEnv);
  }
  if (process.env.NODE_ENV !== "production") {
    return new mongoose.Types.ObjectId(DEV_FALLBACK_BOT_HEX);
  }
  throw new Error("BOT_USER_ID must be set to a valid ObjectId in production");
}

module.exports = { getBotUserId };
