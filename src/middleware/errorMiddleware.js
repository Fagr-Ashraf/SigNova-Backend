function errorMiddleware(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  console.log("🔥 FULL ERROR STACK:");
  console.log(err); // IMPORTANT

  let statusCode = 500;

  if (typeof err.statusCode === "number") {
    statusCode = err.statusCode;
  } else if (typeof err.status === "number") {
    statusCode = err.status;
  }

  return res.status(statusCode).json({
    status: "error",
    session_id: null,
    data: {},
    message: err.message,   // 🔥 ALWAYS SHOW REAL ERROR
    stack: err.stack,       // 🔥 TEMP ONLY (remove later)
  });
}

function notFoundHandler(req, res) {
  return res.status(404).json({
    status: "error",
    session_id: null,
    data: {},
    message: "Route not found",
  });
}

module.exports = { errorMiddleware, notFoundHandler };
