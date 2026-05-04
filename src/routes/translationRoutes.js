const express = require("express");
const translationController = require("../controllers/translationController");
const { authRequired } = require("../middleware/authMiddleware");
const { validateBody } = require("../middleware/validate");
const { wrapMulter } = require("../middleware/multerError");
const { uploadVideo } = require("../middleware/upload");

const router = express.Router();
router.use(authRequired);

const textToSignValidate = validateBody({
  session_id: { required: true, type: "string" },
  text: { required: true, type: "string" },
});

router.post("/text-to-sign", textToSignValidate, translationController.textToSign);
router.post(
  "/sign-to-text",
  wrapMulter(uploadVideo.single("video")),
  translationController.signToText
);

module.exports = router;
