const User = require("../../models/user");

function asyncMiddleware(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

const requireAdmin = asyncMiddleware(async (req, res, next) => {
  const user = await User.findById(req.auth.userId).select("user_type");
  if (!user || user.user_type !== "admin") {
    return res.status(403).json({ message: "Admin access is required" });
  }

  return next();
});

module.exports = requireAdmin;
