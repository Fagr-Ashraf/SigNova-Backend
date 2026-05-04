function sendSuccess(res, data = {}, message = "OK", sessionId = null, statusCode = 200) {
  return res.status(statusCode).json({
    status: "success",
    session_id: sessionId ?? null,
    data,
    message,
  });
}

function sendError(res, message = "Error", sessionId = null, statusCode = 400, data = {}) {
  return res.status(statusCode).json({
    status: "error",
    session_id: sessionId ?? null,
    data,
    message,
  });
}

module.exports = { sendSuccess, sendError };
