const express = require("express");
const userController = require("../controllers/userController");
const { authRequired } = require("../middleware/authMiddleware");
const { uploadAvatar } = require("../middleware/upload");

const searchRouter = express.Router();

searchRouter.use(authRequired);
searchRouter.get("/search", userController.search);

const profileRouter = express.Router();

profileRouter.use(authRequired);

profileRouter.get("/profile", userController.getProfile);
profileRouter.put("/profile", userController.updateProfile);

profileRouter.post(
  "/upload-avatar",
  uploadAvatar.single("avatar"),
  userController.uploadAvatar
);

module.exports = {
  searchRouter,
  profileRouter,
};