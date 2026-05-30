const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./src/routes/authRoutes");
const chatRoutes = require("./src/routes/chatRoutes");
const translationRoutes = require("./src/routes/translationRoutes");
const { searchRouter, profileRouter } = require("./src/routes/userRoutes");
const { errorMiddleware, notFoundHandler } = require("./src/middleware/errorMiddleware");
const cookieParser = require("cookie-parser");
const app = express();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX) || 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.get("/health", (req, res) => {
  res.json({
    status: "success",
    session_id: null,
    data: { ok: true },
    message: "OK",
  });
});

app.use("/auth", authRoutes);
app.use("/users", searchRouter);
app.use("/user", profileRouter);
app.use("/chat", chatRoutes);
app.use("/translation", translationRoutes);

app.use(notFoundHandler);
app.use(errorMiddleware);

module.exports = app;
