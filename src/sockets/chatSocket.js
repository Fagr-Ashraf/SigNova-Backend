const { verifyJwt } = require("../services/authService");
const chatService = require("../services/chatService");

function initChatSocket(io) {
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (typeof socket.handshake.headers?.authorization === "string"
          ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, "")
          : null);
      if (!token) {
        const err = new Error("Authentication required");
        err.data = { code: "UNAUTHORIZED" };
        return next(err);
      }
      const decoded = verifyJwt(token);
      socket.userId = decoded.sub;
      return next();
    } catch (e) {
      const err = new Error("Invalid token");
      err.data = { code: "UNAUTHORIZED" };
      return next(err);
    }
  });

  io.on("connection", (socket) => {
    console.log("🔥 Socket connected:", socket.id);

    socket.on("join_session", async (payload, ack) => {
      try {
        const sessionId = payload?.session_id;
        if (!sessionId) {
          ack?.({ ok: false, message: "session_id is required" });
          return;
        }
        await chatService.assertSessionMember(sessionId, socket.userId);
        await socket.join(String(sessionId));
        ack?.({ ok: true, session_id: String(sessionId) });
      } catch (e) {
        ack?.({ ok: false, message: e.message || "join failed" });
      }
    });

    socket.on("send_message", async (payload, ack) => {
      try {
        const { session_id, type, content, translated_from } = payload || {};
        if (!session_id || !type || content === undefined || content === null || content === "") {
          ack?.({ ok: false, message: "session_id, type, and content are required" });
          return;
        }
        const allowed = [
          "text",
          "image",
          "audio",
          "video",
          "translation_video",
          "translation_text",
        ];
        if (!allowed.includes(type)) {
          ack?.({ ok: false, message: "Invalid message type" });
          return;
        }
        if (
          translated_from != null &&
          translated_from !== "" &&
          !["text", "sign"].includes(translated_from)
        ) {
          ack?.({ ok: false, message: "Invalid translated_from" });
          return;
        }
        const session = await chatService.assertSessionMember(session_id, socket.userId);
        const peer = chatService.otherParticipant(session, socket.userId);
        const dto = await chatService.createMessage({
          sessionId: session_id,
          senderId: socket.userId,
          receiverId: peer,
          type,
          content,
          translated_from: translated_from ?? null,
        });
        io.to(String(session_id)).emit("receive_message", dto);
        ack?.({ ok: true, data: dto });
      } catch (e) {
        ack?.({ ok: false, message: e.message || "send failed" });
      }
    });

    socket.on("typing", (payload) => {
      const sessionId = payload?.session_id;
      if (!sessionId) return;
      socket.to(String(sessionId)).emit("typing", {
        session_id: String(sessionId),
        user_id: socket.userId,
      });
    });
  });
}

module.exports = { initChatSocket };
