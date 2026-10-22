const express = require("express");
const usersController = require("../controllers/usersController");
const authenticateToken = require("../middleware/authenticateToken");

const router = express.Router();

router.get("/", usersController.getUsers);
router.post("/login", usersController.login);
router.get("/me", authenticateToken, usersController.getCurrentUser);
router.post("/", usersController.createUser);
router.get(
  "/:id",
  usersController.validateUserId,
  usersController.getUserById
);
router.put(
  "/:id",
  usersController.validateUserId,
  usersController.replaceUser
);
router.patch(
  "/:id",
  usersController.validateUserId,
  usersController.patchUser
);
router.delete(
  "/:id",
  usersController.validateUserId,
  usersController.deleteUser
);

module.exports = router;
