const mongoose = require("../config/mongoose");
const {
  isTokenVerificationError,
  verifyAccessToken,
} = require("../utils/jwt");

function authenticateToken(req, res, next) {
  const authorization = req.get("authorization");
  const match =
    typeof authorization === "string" &&
    authorization.match(/^Bearer ([^\s]+)$/i);

  if (!match) {
    return res.status(401).json({ message: "Bearer token is required" });
  }

  try {
    const payload = verifyAccessToken(match[1]);

    if (
      typeof payload !== "object" ||
      !payload ||
      Array.isArray(payload) ||
      typeof payload.sub !== "string" ||
      typeof payload.exp !== "number" ||
      !mongoose.isValidObjectId(payload.sub)
    ) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    req.auth = { userId: payload.sub };
    return next();
  } catch (error) {
    if (isTokenVerificationError(error)) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    return next(error);
  }
}

module.exports = authenticateToken;
