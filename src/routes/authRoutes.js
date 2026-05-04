const express = require("express");
const authController = require("../controllers/authController");
const { authRequired } = require("../middleware/authMiddleware");
const { validateBody } = require("../middleware/validate");

const router = express.Router();

const signupValidate = validateBody({
  username: { required: true, type: "string", minLength: 2 },
  email: { required: true, type: "string" },
  phone: { required: true, type: "string" },
  password: { required: true, type: "string", minLength: 8 },
});

function requireIsDeaf(req, res, next) {
  if (typeof req.body.isDeaf === "undefined") {
    return res.status(400).json({
      status: "error",
      session_id: null,
      data: {},
      message: "isDeaf is required",
    });
  }
  if (typeof req.body.isDeaf === "string") {
    req.body.isDeaf = req.body.isDeaf === "true";
  }
  if (typeof req.body.isDeaf !== "boolean") {
    return res.status(400).json({
      status: "error",
      session_id: null,
      data: {},
      message: "isDeaf must be a boolean",
    });
  }
  next();
}

const loginValidate = validateBody({
  email: { required: true, type: "string" },
  password: { required: true, type: "string" },
});

router.post("/signup", signupValidate, requireIsDeaf, authController.signup);
router.post("/login", loginValidate, authController.login);
router.post("/google", authController.google);
router.get("/me", authRequired, authController.me);

module.exports = router;
