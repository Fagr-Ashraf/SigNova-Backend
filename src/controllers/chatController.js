const mongoose = require("mongoose");
const chatService = require("../services/chatService");
const { uploadChatImageBuffer, uploadAudioBuffer, uploadVideoBuffer } = require("../services/cloudinaryService");
const { sendSuccess, sendError } = require("../utils/apiResponse");

function getIo(req) {
  return req.app.get("io");
}

async function start(req, res, next) {
  try {
    const { sender_id, receiver_username } = req.body;
    if (sender_id && sender_id !== req.userId) {
      return sendError(res, "sender_id must match authenticated user", null, 403);
    }
    const { session, receiver } = await chatService.startChat(req.userId, receiver_username);
    return sendSuccess(
      res,
      {
        session_id: session._id.toString(),
        receiver,
      },
      "Chat ready",
      session._id.toString()
    );
  } catch (e) {
    next(e);
  }
}

async function postMessage(req, res, next) {
  try {
    const { session_id, type, content, translated_from } = req.body;
    if (!session_id || !mongoose.Types.ObjectId.isValid(session_id)) {
      return sendError(res, "Valid session_id is required", session_id || null, 400);
    }
    if (!type || !content) {
      return sendError(res, "type and content are required", session_id, 400);
    }
    const allowed = ["text", "image", "audio", "video", "translation_video", "translation_text"];
    if (!allowed.includes(type)) {
      return sendError(res, "Invalid message type", session_id, 400);
    }
    if (
      translated_from != null &&
      translated_from !== "" &&
      !["text", "sign"].includes(translated_from)
    ) {
      return sendError(res, "Invalid translated_from", session_id, 400);
    }
    const session = await chatService.assertSessionMember(session_id, req.userId);
    const peer = chatService.otherParticipant(session, req.userId);
    const dto = await chatService.createMessage({
      sessionId: session_id,
      senderId: req.userId,
      receiverId: peer,
      type,
      content,
      translated_from: translated_from ?? null,
    });
    const io = getIo(req);
    if (io) {
      io.to(session_id.toString()).emit("receive_message", dto);
    }
    return sendSuccess(res, { message: dto }, "Message sent", session_id);
  } catch (e) {
    next(e);
  }
}

async function history(req, res, next) {
  try {
    const { session_id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(session_id)) {
      return sendError(res, "Invalid session_id", session_id, 400);
    }
    const messages = await chatService.getHistory(session_id, req.userId);
    return sendSuccess(res, { messages }, "OK", session_id);
  } catch (e) {
    next(e);
  }
}

async function uploadImage(req, res, next) {
  try {
    const { session_id } = req.body;
    if (!session_id || !mongoose.Types.ObjectId.isValid(session_id)) {
      return sendError(res, "Valid session_id is required", session_id || null, 400);
    }
    if (!req.file || !req.file.buffer) {
      return sendError(res, "Image file is required", session_id, 400);
    }
    const session = await chatService.assertSessionMember(session_id, req.userId);
    const peer = chatService.otherParticipant(session, req.userId);
    const url = await uploadChatImageBuffer(req.file.buffer, req.file.mimetype);
    const dto = await chatService.createMessage({
      sessionId: session_id,
      senderId: req.userId,
      receiverId: peer,
      type: "image",
      content: url,
      translated_from: null,
    });
    const io = getIo(req);
    if (io) {
      io.to(session_id.toString()).emit("receive_message", dto);
    }
    return sendSuccess(res, { message: dto, url }, "Image uploaded", session_id);
  } catch (e) {
    next(e);
  }
}

async function uploadAudio(req, res, next) {
  try {
    const { session_id } = req.body;
    if (!session_id || !mongoose.Types.ObjectId.isValid(session_id)) {
      return sendError(res, "Valid session_id is required", session_id || null, 400);
    }
    if (!req.file || !req.file.buffer) {
      return sendError(res, "Audio file is required", session_id, 400);
    }
    const session = await chatService.assertSessionMember(session_id, req.userId);
    const peer = chatService.otherParticipant(session, req.userId);
    const url = await uploadAudioBuffer(req.file.buffer);
    const dto = await chatService.createMessage({
      sessionId: session_id,
      senderId: req.userId,
      receiverId: peer,
      type: "audio",
      content: url,
      translated_from: null,
    });
    const io = getIo(req);
    if (io) {
      io.to(session_id.toString()).emit("receive_message", dto);
    }
    return sendSuccess(res, { message: dto, url }, "Audio uploaded", session_id);
  } catch (e) {
    next(e);
  }
}

async function uploadVideo(req, res, next) {
  try {
    const { session_id } = req.body;
    if (!session_id || !mongoose.Types.ObjectId.isValid(session_id)) {
      return sendError(res, "Valid session_id is required", session_id || null, 400);
    }
    if (!req.file || !req.file.buffer) {
      return sendError(res, "Video file is required", session_id, 400);
    }
    const session = await chatService.assertSessionMember(session_id, req.userId);
    const peer = chatService.otherParticipant(session, req.userId);
    const url = await uploadVideoBuffer(req.file.buffer);
    const dto = await chatService.createMessage({
      sessionId: session_id,
      senderId: req.userId,
      receiverId: peer,
      type: "video",
      content: url,
      translated_from: null,
    });
    const io = getIo(req);
    if (io) {
      io.to(session_id.toString()).emit("receive_message", dto);
    }
    return sendSuccess(res, { message: dto, url }, "Video uploaded", session_id);
  } catch (e) {
    next(e);
  }
}

module.exports = { start, postMessage, history, uploadImage, uploadAudio, uploadVideo };
