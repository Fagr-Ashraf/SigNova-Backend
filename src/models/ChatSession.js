const mongoose = require("mongoose");

const chatSessionSchema = new mongoose.Schema(
  {
    participantKey: { type: String, required: true, unique: true, index: true },
    participants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      validate: {
        validator(v) {
          return Array.isArray(v) && v.length === 2;
        },
        message: "Session must have exactly two participants",
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatSession", chatSessionSchema);
