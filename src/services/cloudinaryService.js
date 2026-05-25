const stream = require("stream");
const { cloudinary } = require("../config/cloudinary");

function uploadBuffer(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || "signnova",
        resource_type: options.resource_type || "auto",
        ...options.extra,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    bufferStream.pipe(uploadStream);
  });
}

async function uploadAvatarBuffer(buffer) {
  const result = await uploadBuffer(buffer, {
    folder: "signnova/users/avatars",
    resource_type: "image",
  });

  return result.secure_url;
}

async function uploadChatImageBuffer(buffer) {
  const result = await uploadBuffer(buffer, {
    folder: "signnova/chat/images",
    resource_type: "image",
  });

  return result.secure_url;
}

async function uploadAudioBuffer(buffer) {
  const result = await uploadBuffer(buffer, {
    folder: "signnova/chat/audio",
    resource_type: "auto",
  });
  return result.secure_url;
}

async function uploadVideoBuffer(buffer) {
  const result = await uploadBuffer(buffer, {
    folder: "signnova/chat/video",
    resource_type: "video",
    extra: {
      format: "mp4",
      secure: true
    }
  });

  return result.secure_url;
}

module.exports = {
  uploadAvatarBuffer,
  uploadChatImageBuffer,
  uploadAudioBuffer,
  uploadVideoBuffer,
  uploadBuffer,
};
