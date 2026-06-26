const authService = require("../services/authService");
const { sendSuccess, sendError } = require("../utils/apiResponse");

/* ================= SIGNUP ================= */

async function signup(req, res, next) {
  try {
    const { user, accessToken, refreshToken } =
      await authService.signup(req.body);

    return sendSuccess(
      res,
      {
        user: authService.toPublicUser(user),
        accessToken,
        refreshToken,
      },
      "Account created",
      null,
      201
    );
  } catch (e) {
    next(e);
  }
}

/* ================= LOGIN ================= */

async function login(req, res, next) {
  try {
    const { user, accessToken, refreshToken } =
      await authService.login(req.body);

    return sendSuccess(
      res,
      {
        user: authService.toPublicUser(user),
        accessToken,
        refreshToken,
      },
      "Logged in"
    );
  } catch (e) {
    next(e);
  }
}

/* ================= GOOGLE ================= */

async function google(req, res, next) {
  try {
    const { idToken } = req.body;

    if (!idToken) return sendError(res, "idToken is required", null, 400);

    const { user, accessToken, refreshToken } =
      await authService.loginWithGoogle({ idToken });

    return sendSuccess(
      res,
      {
        user: authService.toPublicUser(user),
        accessToken,
        refreshToken,
      },
      "Logged in with Google"
    );
  } catch (e) {
    next(e);
  }
}

/* ================= REFRESH ================= */

async function refresh(req, res, next) {
  try {
    // Flutter sends it in body (NO cookies)
    const { refreshToken } = req.body;

    const tokens = await authService.refresh(refreshToken);

    return sendSuccess(
      res,
      tokens,
      "Token refreshed"
    );
  } catch (e) {
    next(e);
  }
}

/* ================= LOGOUT ================= */

async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;

    await authService.logout(refreshToken);

    return sendSuccess(res, null, "Logged out");
  } catch (e) {
    next(e);
  }
}

/* ================= ME ================= */

async function me(req, res) {
  return sendSuccess(
    res,
    { user: authService.toPublicUser(req.user) },
    "OK"
  );
}

module.exports = {
  signup,
  login,
  google,
  refresh,
  logout,
  me,
};