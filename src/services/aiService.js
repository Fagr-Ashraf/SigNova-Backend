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
 * TEXT → SIGN (video buffer)
 */
async function callTextToSign(text) {
  if (!text || typeof text !== "string") {
    throw new Error("text is required");
  }

const res = await axios.post(
  `${getBaseUrl()}/text-to-sign/`,
  { text },
  {
    responseType: "arraybuffer", // MUST
    headers: {
      "Accept": "video/mp4"
    },
    timeout: 120000,
    validateStatus: () => true,
  }
);

if (res.status >= 400) {
  throw new Error("FastAPI failed");
}

return Buffer.from(res.data); // OK now
}

/**
 * SIGN → TEXT (video upload)
 */
async function callSignToText(videoFile) {
  if (!videoFile?.buffer) {
    throw new Error("video file is required");
  }

  const form = new FormData();

  form.append("video", videoFile.buffer, {
    filename: videoFile.originalname || "sign.webm",
    contentType: videoFile.mimetype || "video/webm",
  });

  const res = await axios.post(
    `${getBaseUrl()}/sign-to-text/`,
    form,
    {
      headers: form.getHeaders(),
      timeout: 120000,
      validateStatus: () => true,
    }
  );

  if (res.status >= 400) {
    throw new Error(
      `FastAPI sign-to-text failed (${res.status}): ${
        typeof res.data === "string"
          ? res.data
          : JSON.stringify(res.data)
      }`
    );
  }

  const data = res.data;

  // ✅ FULL ROBUST PARSING (IMPORTANT FIX)
  const text =
    data?.english ||          // 👈 YOUR ACTUAL OUTPUT
    data?.translation ||
    data?.text ||
    data?.transcription ||
    data?.result ||
    data?.output ||
    data?.message;

  if (!text) {
    throw new Error(
      `Translation returned empty text. Response: ${JSON.stringify(data)}`
    );
  }

  return text;
}

module.exports = {
  callTextToSign,
  callSignToText,
};