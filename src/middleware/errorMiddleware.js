function errorMiddleware(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }
  let statusCode = 500;
  if (err.isAxiosError) {
    const s = err.response?.status;
    statusCode = typeof s === "number" && s >= 400 ? s : 502;
  } else if (typeof err.statusCode === "number" && err.statusCode >= 400) {
    statusCode = err.statusCode;
  } else if (typeof err.status === "number" && err.status >= 400) {
    statusCode = err.status;
  }
  const message =
    statusCode === 500 && process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message || "Internal server error";
  return res.status(statusCode).json({
    status: "error",
    session_id: null,
    data: {},
    message,
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
