const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 2,
      maxlength: 32,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, select: false },
    dob: { type: Date, default: null },
    gender: { type: String, default: null, trim: true },
    isDeaf: { type: Boolean, required: true, default: false },
    avatar: { type: String, default: null },
    refreshToken: {
      type: String,
      default: null,
      },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

module.exports = mongoose.model("User", userSchema);
