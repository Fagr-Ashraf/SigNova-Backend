function validateBody(rules) {
  return (req, res, next) => {
    const errors = [];
    for (const [field, check] of Object.entries(rules)) {
      const value = req.body[field];
      if (check.required && (value === undefined || value === null || value === "")) {
        errors.push(`${field} is required`);
        continue;
      }
      if (value !== undefined && value !== null && check.type) {
        const ok =
          check.type === "string"
            ? typeof value === "string"
            : check.type === "boolean"
              ? typeof value === "boolean"
              : true;
        if (!ok) errors.push(`${field} must be ${check.type}`);
      }
      if (check.minLength && typeof value === "string" && value.length < check.minLength) {
        errors.push(`${field} must be at least ${check.minLength} characters`);
      }
    }
    if (errors.length) {
      return res.status(400).json({
        status: "error",
        session_id: null,
        data: { errors },
        message: errors.join("; "),
      });
    }
    next();
  };
}

module.exports = { validateBody };
