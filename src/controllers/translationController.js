const mongoose = require("mongoose");

const chatService = require("../services/chatService");

const {
  callTextToSign,
  callSignToText,
} = require("../services/aiService");

const {
  uploadVideoBuffer,
} = require("../services/cloudinaryService");

const {
  sendSuccess,
  sendError,
} = require("../utils/apiResponse");

function getIo(req) {
  return req.app.get("io");
}

function emitTranslation(io, sessionId, dto) {
  if (!io) return;

  const room = String(sessionId);

  io.to(room).emit("receive_message", dto);

  io.to(room).emit("translation_result", {
    session_id: room,
    message: dto,
  });
}

/* =========================================================
   CHAT MODE
========================================================= */

async function textToSign(req, res, next) {
  try {
    const { session_id, text } = req.body;

    if (!session_id || !mongoose.Types.ObjectId.isValid(session_id)) {
      return sendError(
        res,
        "Valid session_id is required",
        session_id || null,
        400
      );
    }

    if (!text || typeof text !== "string" || !text.trim()) {
      return sendError(
        res,
        "text is required",
        session_id,
        400
      );
    }

    const session = await chatService.assertSessionMember(
      session_id,
      req.userId
    );

    let videoBuf;

    try {
      videoBuf = await callTextToSign(text.trim());
    } catch (e) {
      e.statusCode = e.statusCode || 502;
      throw e;
    }

    let url;

    try {
      url = await uploadVideoBuffer(videoBuf);
    } catch (e) {
      e.statusCode = 502;
      e.message = `Cloudinary upload failed: ${e.message}`;
      throw e;
    }

    const dto = await chatService.addBotTranslationMessage({
      session,
      humanUserId: req.userId,
      type: "translation_video",
      content: url,
      translated_from: "text",
    });

    emitTranslation(getIo(req), session_id, dto);

    return sendSuccess(
      res,
      { message: dto },
      "Translation video ready",
      session_id
    );
  } catch (e) {
    next(e);
  }
}

async function signToText(req, res, next) {
  try {
    const { session_id } = req.body;

    if (!session_id || !mongoose.Types.ObjectId.isValid(session_id)) {
      return sendError(
        res,
        "Valid session_id is required",
        session_id || null,
        400
      );
    }

    if (!req.file || !req.file.buffer) {
      return sendError(
        res,
        "Video file is required",
        session_id,
        400
      );
    }

    const session = await chatService.assertSessionMember(
      session_id,
      req.userId
    );

    let uploadedVideoUrl;

    try {
      uploadedVideoUrl = await uploadVideoBuffer(req.file.buffer);
    } catch (e) {
      e.statusCode = 502;
      e.message = `Cloudinary upload failed: ${e.message}`;
      throw e;
    }

    let translated;

    try {
      translated = await callSignToText(req.file);
    } catch (e) {
      e.statusCode = e.statusCode || 502;
      throw e;
    }

    if (!translated || !String(translated).trim()) {
      return sendError(
        res,
        "Translation returned empty text",
        session_id,
        502
      );
    }

    const dto = await chatService.addBotTranslationMessage({
      session,
      humanUserId: req.userId,
      type: "translation_text",
      content: String(translated).trim(),
      translated_from: "sign",
      video_url: uploadedVideoUrl,
    });

    emitTranslation(getIo(req), session_id, dto);

    return sendSuccess(
      res,
      {
        message: dto,
        text: dto.content,
      },
      "Translation text ready",
      session_id
    );
  } catch (e) {
    next(e);
  }
}

/* =========================================================
   STANDALONE MODE (NO CHAT)
========================================================= */

async function standaloneTextToSign(req, res, next) {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return sendError(
        res,
        "text is required",
        null,
        400
      );
    }

    let videoBuf;

    try {
      videoBuf = await callTextToSign(text.trim());
    } catch (e) {
      e.statusCode = e.statusCode || 502;
      throw e;
    }

    let url;

    try {
      url = await uploadVideoBuffer(videoBuf);
    } catch (e) {
      e.statusCode = 502;
      e.message = `Cloudinary upload failed: ${e.message}`;
      throw e;
    }

    return sendSuccess(
      res,
      {
        video_url: url,
      },
      "Standalone translation video ready"
    );
  } catch (e) {
    next(e);
  }
}

async function standaloneSignToText(req, res, next) {
  try {
    if (!req.file || !req.file.buffer) {
      return sendError(
        res,
        "Video file is required",
        null,
        400
      );
    }

    let translated;

    try {
      translated = await callSignToText(req.file);
    } catch (e) {
      e.statusCode = e.statusCode || 502;
      throw e;
    }

    if (!translated || !String(translated).trim()) {
      return sendError(
        res,
        "Translation returned empty text",
        null,
        502
      );
    }

    return sendSuccess(
      res,
      {
        text: String(translated).trim(),
      },
      "Standalone translation text ready"
    );
  } catch (e) {
    next(e);
  }
}

module.exports = {
  textToSign,
  signToText,

  // NEW
  standaloneTextToSign,
  standaloneSignToText,
};