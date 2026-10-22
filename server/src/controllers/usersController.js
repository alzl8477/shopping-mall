const { randomBytes, scrypt, timingSafeEqual } = require("node:crypto");
const { promisify } = require("node:util");
const mongoose = require("../config/mongoose");
const {
  accessTokenLifetimeSeconds,
  issueAccessToken,
} = require("../utils/jwt");
const User = require("../../models/user");

const scryptAsync = promisify(scrypt);
const userFields = new Set([
  "email",
  "name",
  "user_id",
  "password",
  "user_type",
  "address",
]);

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function getUserInput(body, { partial = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    const error = new Error("Request body must be a JSON object");
    error.status = 400;
    throw error;
  }

  const unknownFields = Object.keys(body).filter((field) => !userFields.has(field));
  if (unknownFields.length > 0) {
    const error = new Error(`Unknown user field(s): ${unknownFields.join(", ")}`);
    error.status = 400;
    throw error;
  }

  const input = {};
  for (const field of userFields) {
    if (Object.hasOwn(body, field)) {
      input[field] = body[field];
    }
  }

  if (!partial) {
    return input;
  }

  if (Object.keys(input).length === 0) {
    const error = new Error("At least one user field must be provided");
    error.status = 400;
    throw error;
  }

  return input;
}

async function hashPassword(password) {
  if (typeof password !== "string" || password.length < 8) {
    const error = new Error("Password must be at least 8 characters long");
    error.status = 400;
    throw error;
  }

  const salt = randomBytes(16).toString("hex");
  const key = await scryptAsync(password, salt, 64);
  return `scrypt$16384$8$1$${salt}$${key.toString("hex")}`;
}

async function verifyPassword(password, passwordHash) {
  const [algorithm, cost, blockSize, parallelization, salt, keyHex] =
    passwordHash.split("$");
  if (
    algorithm !== "scrypt" ||
    cost !== "16384" ||
    blockSize !== "8" ||
    parallelization !== "1" ||
    !/^[a-f0-9]{32}$/.test(salt) ||
    !/^[a-f0-9]{128}$/.test(keyHex)
  ) {
    throw new Error("Stored password hash is invalid");
  }

  const expectedKey = Buffer.from(keyHex, "hex");
  const actualKey = await scryptAsync(password, salt, expectedKey.length);
  return timingSafeEqual(actualKey, expectedKey);
}

function serializeUser(user) {
  const userObject = user.toObject();
  delete userObject.password;
  return userObject;
}

function validateUserId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  return next();
}

const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users.map(serializeUser));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.auth.userId);
  if (!user) {
    return res.status(401).json({ message: "Authenticated user no longer exists" });
  }

  return res.json(serializeUser(user));
});

const createUser = asyncHandler(async (req, res) => {
  const userData = getUserInput(req.body);
  userData.password = await hashPassword(userData.password);
  userData.user_type = "customer";

  const user = await User.create(userData);
  res.status(201).json(serializeUser(user));
});

const login = asyncHandler(async (req, res) => {
  if (
    !req.body ||
    typeof req.body !== "object" ||
    Array.isArray(req.body) ||
    typeof req.body.identifier !== "string" ||
    typeof req.body.password !== "string" ||
    !req.body.identifier.trim() ||
    !req.body.password
  ) {
    return res.status(400).json({
      message: "Identifier and password are required",
    });
  }

  const identifier = req.body.identifier.trim();
  const user = await User.findOne({
    $or: [
      { user_id: identifier },
      { email: identifier.toLowerCase() },
    ],
  }).select("+password");

  if (!user || !(await verifyPassword(req.body.password, user.password))) {
    return res.status(401).json({
      message: "Invalid ID/email or password",
    });
  }

  const token = issueAccessToken(user);

  return res.json({
    message: "Login successful",
    token,
    tokenType: "Bearer",
    expiresIn: accessTokenLifetimeSeconds,
    user: serializeUser(user),
  });
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json(serializeUser(user));
});

function updateUser({ partial }) {
  return asyncHandler(async (req, res) => {
    const updates = getUserInput(req.body, { partial });

    if (!partial) {
      const requiredFields = ["email", "name", "user_id", "password", "user_type"];
      const missingFields = requiredFields.filter(
        (field) => !Object.hasOwn(updates, field)
      );
      if (missingFields.length > 0) {
        const error = new Error(
          `Missing required field(s): ${missingFields.join(", ")}`
        );
        error.status = 400;
        throw error;
      }
    }

    if (Object.hasOwn(updates, "password")) {
      updates.password = await hashPassword(updates.password);
    }

    const update = { $set: updates };
    if (!partial && !Object.hasOwn(updates, "address")) {
      update.$unset = { address: 1 };
    }

    const user = await User.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(serializeUser(user));
  });
}

const replaceUser = updateUser({ partial: false });
const patchUser = updateUser({ partial: true });

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.status(204).end();
});

module.exports = {
  createUser,
  deleteUser,
  getUserById,
  getCurrentUser,
  getUsers,
  login,
  patchUser,
  replaceUser,
  validateUserId,
};
