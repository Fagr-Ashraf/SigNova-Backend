const ChatSession = require("../models/ChatSession");
const Message = require("../models/Message");
const User = require("../models/User");
const { participantKeyFromIds } = require("../utils/sessionKey");
const { getBotUserId } = require("../utils/botUser");

async function findOrCreateSession(userIdA, userIdB) {
  if (userIdA.toString() === userIdB.toString()) {
    const err = new Error("Cannot start a chat with yourself");
    err.statusCode = 400;
    throw err;
  }
  const key = participantKeyFromIds(userIdA, userIdB);
  let session = await ChatSession.findOne({ participantKey: key });
  if (!session) {
    const sorted = [userIdA, userIdB].sort((a, b) => a.toString().localeCompare(b.toString()));
    session = await ChatSession.create({
      participantKey: key,
      participants: sorted,
    });
  }
  return session;
}

async function assertSessionMember(sessionId, userId) {
  const session = await ChatSession.findById(sessionId);
  if (!session) {
    const err = new Error("Session not found");
    err.statusCode = 404;
    throw err;
  }
  const uid = userId.toString();
  const ok = session.participants.some((p) => p.toString() === uid);
  if (!ok) {
    const err = new Error("Forbidden: not a session member");
    err.statusCode = 403;
    throw err;
  }
  return session;
}

function otherParticipant(session, userId) {
  const uid = userId.toString();
  return session.participants.find((p) => p.toString() !== uid);
}

async function startChat(senderId, receiverUsername) {
  const receiver = await User.findOne({ username: String(receiverUsername).toLowerCase().trim() });
  if (!receiver) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  const session = await findOrCreateSession(senderId, receiver._id);
  return {
    session,
    receiver: { username: receiver.username, avatar: receiver.avatar },
  };
}

function toMessageDto(doc) {
  return {
    message_id: doc._id.toString(),
    session_id: doc.session_id.toString(),
    sender_id: doc.sender_id.toString(),
    receiver_id: doc.receiver_id.toString(),
    type: doc.type,
    content: doc.content,
    translated_from: doc.translated_from ?? null,
    timestamp: doc.timestamp,
  };
}

async function createMessage({
  sessionId,
  senderId,
  receiverId,
  type,
  content,
  translated_from = null,
}) {
  const msg = await Message.create({
    session_id: sessionId,
    sender_id: senderId,
    receiver_id: receiverId,
    type,
    content,
    translated_from,
    timestamp: new Date(),
  });
  return toMessageDto(msg);
}

async function addBotTranslationMessage({ session, humanUserId, type, content, translated_from }) {
  const botId = getBotUserId();
  const receiverId = humanUserId;
  return createMessage({
    sessionId: session._id,
    senderId: botId,
    receiverId,
    type,
    content,
    translated_from,
  });
}

async function getHistory(sessionId, userId) {
  await assertSessionMember(sessionId, userId);
  const rows = await Message.find({ session_id: sessionId }).sort({ timestamp: 1 }).lean();
  return rows.map((r) =>
    toMessageDto({
      _id: r._id,
      session_id: r.session_id,
      sender_id: r.sender_id,
      receiver_id: r.receiver_id,
      type: r.type,
      content: r.content,
      translated_from: r.translated_from,
      timestamp: r.timestamp,
    })
  );
}

module.exports = {
  findOrCreateSession,
  assertSessionMember,
  startChat,
  createMessage,
  addBotTranslationMessage,
  getHistory,
  otherParticipant,
  toMessageDto,
};
