function wrapMulter(middleware) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          status: "error",
          session_id: null,
          data: {},
          message: err.message || "File upload error",
        });
      }
      next();
    });
  };
}

module.exports = { wrapMulter };
