const authService = require("../services/authService");
const { sendSuccess, sendError } = require("../utils/apiResponse");

async function signup(req, res, next) {
  try {
    const { user, token } = await authService.signup(req.body);
    return sendSuccess(
      res,
      { token, user: authService.toPublicUser(user) },
      "Account created",
      null,
      201
    );
  } catch (e) {
    next(e);
  }
}

async function login(req, res, next) {
  try {
    const { user, token } = await authService.login(req.body);
    return sendSuccess(res, { token, user: authService.toPublicUser(user) }, "Logged in");
  } catch (e) {
    next(e);
  }
}

async function google(req, res, next) {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return sendError(res, "idToken is required", null, 400);
    }
    const { user, token } = await authService.loginWithGoogle({ idToken });
    return sendSuccess(res, { token, user: authService.toPublicUser(user) }, "Logged in with Google");
  } catch (e) {
    next(e);
  }
}

async function me(req, res) {
  return sendSuccess(res, { user: authService.toPublicUser(req.user) }, "OK");
}

module.exports = { signup, login, google, me };
