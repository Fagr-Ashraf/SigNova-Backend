require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const { connectDb } = require("./src/config/db");
const { configureCloudinary } = require("./src/config/cloudinary");
const { initChatSocket } = require("./src/sockets/chatSocket");

async function start() {
  configureCloudinary();
  await connectDb();

  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    path: "/ws/chat",
    cors: {
      origin: process.env.CORS_ORIGIN || true,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });
  console.log("Cloudinary:", {
    cloud: process.env.CLOUDINARY_CLOUD_NAME,
    key: process.env.CLOUDINARY_API_KEY,
    secret: process.env.CLOUDINARY_API_SECRET ? "OK" : "MISSING"
  });
  
  app.set("io", io);
  initChatSocket(io);

  const port = Number(process.env.PORT) || 3000;
  httpServer.listen(port, () => {
    console.log(`SignNova API listening on http://127.0.0.1:${port}`);
    console.log(`Socket.IO path: /ws/chat`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
