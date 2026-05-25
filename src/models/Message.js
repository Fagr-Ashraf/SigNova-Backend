const mongoose = require("mongoose");

const MESSAGE_TYPES = [
  "text",
  "image",
  "audio",
  "video",
  "translation_video",
  "translation_text",
];

const messageSchema = new mongoose.Schema(
  {
    session_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatSession",
      required: true,
      index: true,
    },

    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: MESSAGE_TYPES,
      required: true,
    },

    content: {
      type: String,
      required: true,
    },

    // ✅ NEW FIELD
    video_url: {
      type: String,
      default: null,
    },

    translated_from: {
      type: String,
      default: null,
      validate: {
        validator(v) {
          return v == null || v === "text" || v === "sign";
        },
        message: "translated_from must be text, sign, or null",
      },
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

messageSchema.index({ session_id: 1, timestamp: 1 });

module.exports = mongoose.model("Message", messageSchema);
module.exports.MESSAGE_TYPES = MESSAGE_TYPES;