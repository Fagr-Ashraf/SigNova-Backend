const ChatSession = require("../models/ChatSession");
const Message = require("../models/Message");
const User = require("../models/User");
const { participantKeyFromIds } = require("../utils/sessionKey");

// ✅ NEW: Business logic to fetch user's chat listing sorted by the latest message
async function getUserSessions(userId) {
  // Find all sessions where this user is listed in the participants array
  const sessions = await ChatSession.find({ participants: userId })
    .populate("participants", "username avatar")
    .lean();

  const formattedSessions = [];

  for (const session of sessions) {
    // 1. Separate out the other user's profile information
    const peerDoc = session.participants.find(
      (p) => p._id.toString() !== userId.toString()
    );

    // If there is no chat partner (safety fallback), skip
    if (!peerDoc) continue;

    // 2. Fetch the absolute newest message for this session
    const lastMsgDoc = await Message.findOne({ session_id: session._id })
      .sort({ timestamp: -1 })
      .lean();

    let lastMessage = null;
    if (lastMsgDoc) {
      lastMessage = {
        content: lastMsgDoc.content,
        type: lastMsgDoc.type,
        timestamp: lastMsgDoc.timestamp,
      };
    }

    formattedSessions.push({
      session_id: session._id.toString(),
      peer: {
        _id: peerDoc._id.toString(),
        username: peerDoc.username,
        avatar: peerDoc.avatar || null,
      },
      last_message: lastMessage,
    });
  }

  // 3. Sort sessions: highest timestamp (most recent) first. Sessions with no messages fall to the bottom.
  return formattedSessions.sort((a, b) => {
    const timeA = a.last_message ? new Date(a.last_message.timestamp) : new Date(0);
    const timeB = b.last_message ? new Date(b.last_message.timestamp) : new Date(0);
    return timeB - timeA;
  });
}

async function findOrCreateSession(userIdA, userIdB) {
  if (userIdA.toString() === userIdB.toString()) {
    const err = new Error("Cannot start a chat with yourself");
    err.statusCode = 400;
    throw err;
  }

  const key = participantKeyFromIds(userIdA, userIdB);

  let session = await ChatSession.findOne({ participantKey: key });

  if (!session) {
    const sorted = [userIdA, userIdB].sort((a, b) =>
      a.toString().localeCompare(b.toString())
    );

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

  const ok = session.participants.some(
    (p) => p.toString() === uid
  );

  if (!ok) {
    const err = new Error("Forbidden: not a session member");
    err.statusCode = 403;
    throw err;
  }

  return session;
}

function otherParticipant(session, userId) {
  const uid = userId.toString();

  return session.participants.find(
    (p) => p.toString() !== uid
  );
}

async function startChat(senderId, receiverUsername) {
  const receiver = await User.findOne({
    username: String(receiverUsername).toLowerCase().trim(),
  });

  if (!receiver) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  const session = await findOrCreateSession(
    senderId,
    receiver._id
  );

  return {
    session,
    receiver: {
      username: receiver.username,
      avatar: receiver.avatar,
    },
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
    video_url: doc.video_url ?? null,
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
  video_url = null,
}) {
  const msg = await Message.create({
    session_id: sessionId,
    sender_id: senderId,
    receiver_id: receiverId,
    type,
    content,
    video_url,
    translated_from,
    timestamp: new Date(),
  });

  return toMessageDto(msg);
}

async function addTranslationMessage({
  session,
  humanUserId,
  type,
  content,
  translated_from,
  video_url = null,
}) {
  // Find the other participant in the chat
  const receiverId = otherParticipant(session, humanUserId);

  return createMessage({
    sessionId: session._id,
    senderId: humanUserId,
    receiverId,
    type,
    content,
    translated_from,
    video_url,
  });
}

async function getHistory(sessionId, userId) {
  await assertSessionMember(sessionId, userId);

  const rows = await Message.find({
    session_id: sessionId,
  })
    .sort({ timestamp: 1 })
    .lean();

  return rows.map((r) =>
    toMessageDto({
      _id: r._id,
      session_id: r.session_id,
      sender_id: r.sender_id,
      receiver_id: r.receiver_id,
      type: r.type,
      content: r.content,
      video_url: r.video_url,
      translated_from: r.translated_from,
      timestamp: r.timestamp,
    })
  );
}

module.exports = {
  getUserSessions,
  findOrCreateSession,
  assertSessionMember,
  startChat,
  createMessage,
  addTranslationMessage,
  getHistory,
  otherParticipant,
  toMessageDto,
};