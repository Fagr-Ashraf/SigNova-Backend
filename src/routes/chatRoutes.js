const express = require("express");
const chatController = require("../controllers/chatController");
const { authRequired } = require("../middleware/authMiddleware");
const { validateBody } = require("../middleware/validate");
const { wrapMulter } = require("../middleware/multerError");
const { uploadImage, uploadAudio, uploadVideo } = require("../middleware/upload");

const router = express.Router();
router.use(authRequired);

const startValidate = validateBody({
  receiver_username: { required: true, type: "string" },
});

router.post("/start", startValidate, chatController.start);
router.post("/message", chatController.postMessage);
router.get("/history/:session_id", chatController.history);
router.post(
  "/upload-image",
  wrapMulter(uploadImage.single("file")),
  chatController.uploadImage
);
router.post(
  "/upload-audio",
  wrapMulter(uploadAudio.single("file")),
  chatController.uploadAudio
);
router.post(
  "/upload-video",
  wrapMulter(uploadVideo.single("file")),
  chatController.uploadVideo
);

module.exports = router;
