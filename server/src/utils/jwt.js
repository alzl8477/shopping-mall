const jwt = require("jsonwebtoken");

const accessTokenLifetimeSeconds = 60 * 60;

function getJwtSecret() {
  const jwtSecret = process.env.JWT_SECRET;
  if (typeof jwtSecret !== "string" || Buffer.byteLength(jwtSecret) < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 bytes");
  }
  return jwtSecret;
}

function issueAccessToken(user) {
  return jwt.sign(
    { userType: user.user_type },
    getJwtSecret(),
    {
      algorithm: "HS256",
      expiresIn: accessTokenLifetimeSeconds,
      subject: String(user._id),
    }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret(), {
    algorithms: ["HS256"],
  });
}

function isTokenVerificationError(error) {
  return (
    error instanceof jwt.JsonWebTokenError ||
    error instanceof jwt.TokenExpiredError ||
    error instanceof jwt.NotBeforeError
  );
}

module.exports = {
  accessTokenLifetimeSeconds,
  isTokenVerificationError,
  issueAccessToken,
  verifyAccessToken,
};
