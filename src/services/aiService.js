const axios = require("axios");
const FormData = require("form-data");

function getBaseUrl() {
  const url = process.env.AI_SERVICE_URL;
  if (!url) {
    throw new Error("AI_SERVICE_URL is not configured");
  }
  return url.replace(/\/$/, "");
}

/**
 * @param {string} text
 * @returns {Promise<Buffer>} Raw video bytes from FastAPI
 */
async function callTextToSign(text) {
  if (!text || typeof text !== "string") {
    throw new Error("text is required");
  }
  const res = await axios.post(
    `${getBaseUrl()}/ai/text-to-sign`,
    { text },
    {
      responseType: "arraybuffer",
      timeout: 120000,
      validateStatus: () => true,
    }
  );
  if (res.status >= 400) {
    const errText =
      typeof res.data === "string"
        ? res.data
        : Buffer.isBuffer(res.data)
          ? res.data.toString("utf8")
          : JSON.stringify(res.data);
    throw new Error(`FastAPI text-to-sign failed (${res.status}): ${errText}`);
  }
  return Buffer.from(res.data);
}

/**
 * @param {Express.Multer.File} videoFile
 * @returns {Promise<string>} Translated text from FastAPI
 */
async function callSignToText(videoFile) {
  if (!videoFile || !videoFile.buffer) {
    throw new Error("video file is required");
  }
  const form = new FormData();
  form.append("file", videoFile.buffer, {
    filename: videoFile.originalname || "sign.webm",
    contentType: videoFile.mimetype || "video/webm",
  });
  const res = await axios.post(`${getBaseUrl()}/ai/sign-to-text`, form, {
    headers: form.getHeaders(),
    timeout: 120000,
    validateStatus: () => true,
  });
  if (res.status >= 400) {
    throw new Error(
      `FastAPI sign-to-text failed (${res.status}): ${typeof res.data === "string" ? res.data : JSON.stringify(res.data)}`
    );
  }
  const data = res.data;
  if (typeof data === "string") return data;
  if (data && typeof data.text === "string") return data.text;
  if (data && typeof data.transcription === "string") return data.transcription;
  return String(data?.result ?? data?.message ?? "");
}

module.exports = {
  callTextToSign,
  callSignToText,
};
