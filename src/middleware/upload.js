const multer = require("multer");

const memory = multer.memoryStorage();

const imageMime = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const audioMime = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/aac",
]);
const videoMime = new Set(["video/webm", "video/mp4", "video/quicktime", "video/mpeg"]);

function fileFilterImage(req, file, cb) {
  if (imageMime.has(file.mimetype)) return cb(null, true);
  cb(new Error("Only JPEG, PNG, WEBP, or GIF images are allowed"));
}

function fileFilterAudio(req, file, cb) {
  if (audioMime.has(file.mimetype)) return cb(null, true);
  cb(new Error("Unsupported audio type"));
}

function fileFilterVideo(req, file, cb) {
  if (videoMime.has(file.mimetype)) return cb(null, true);
  cb(new Error("Unsupported video type"));
}

const uploadImage = multer({
  storage: memory,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: fileFilterImage,
});

const uploadAudio = multer({
  storage: memory,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: fileFilterAudio,
});

const uploadVideo = multer({
  storage: memory,
  limits: { fileSize: 80 * 1024 * 1024 },
  fileFilter: fileFilterVideo,
});

const uploadAvatar = multer({
  storage: memory,
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: fileFilterImage,
});

module.exports = {
  uploadImage,
  uploadAudio,
  uploadVideo,
  uploadAvatar,
};
