const express = require("express");

const translationController = require("../controllers/translationController");

const { authRequired } = require("../middleware/authMiddleware");

const { validateBody } = require("../middleware/validate");

const { wrapMulter } = require("../middleware/multerError");

const { uploadVideo } = require("../middleware/upload");

const router = express.Router();

/* =========================================================
   CHAT TRANSLATION ROUTES
========================================================= */

const textToSignValidate = validateBody({
  session_id: { required: true, type: "string" },
  text: { required: true, type: "string" },
});

router.post(
  "/text-to-sign",
  authRequired,
  textToSignValidate,
  translationController.textToSign
);

router.post(
  "/sign-to-text",
  authRequired,
  wrapMulter(uploadVideo.single("video")),
  translationController.signToText
);

/* =========================================================
   STANDALONE TRANSLATION ROUTES
========================================================= */

const standaloneTextValidate = validateBody({
  text: { required: true, type: "string" },
});

router.post(
  "/standalone/text-to-sign",
  // authRequired,
  standaloneTextValidate,
  translationController.standaloneTextToSign
);

router.post(
  "/standalone/sign-to-text",
  // authRequired,
  wrapMulter(uploadVideo.single("video")),
  translationController.standaloneSignToText
);

module.exports = router;