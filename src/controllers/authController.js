const authService = require("../services/authService");
const { sendSuccess, sendError } = require("../utils/apiResponse");

/* ================= SIGNUP ================= */

async function signup(req, res, next) {
  try {
    const { user, accessToken, refreshToken } = await authService.signup(req.body);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
    });
    console.log("SIGNUP RESPONSE:", {
      accessToken,
      refreshToken,
    });
    return sendSuccess(
      res,
      {
        accessToken,
        user: authService.toPublicUser(user),
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
    const { user, accessToken, refreshToken } = await authService.login(req.body);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
    });

    return sendSuccess(
      res,
      {
        accessToken,
        user: authService.toPublicUser(user),
      },
      "Logged in"
    );
  } catch (e) {
    console.log("🔥 LOGIN ERROR FULL:", e); // ADD THIS
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

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
    });

    return sendSuccess(
      res,
      {
        accessToken,
        user: authService.toPublicUser(user),
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
    const token = req.cookies.refreshToken;

    const { accessToken } = await authService.refresh(token);

    return sendSuccess(res, { accessToken }, "Token refreshed");
  } catch (e) {
    next(e);
  }
}

/* ================= LOGOUT ================= */

async function logout(req, res, next) {
  try {
    const token = req.cookies.refreshToken;

    await authService.logout(token);

    res.clearCookie("refreshToken");

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
  me,
  refresh,
  logout,
};