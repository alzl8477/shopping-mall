const express = require("express");
const wishlistController = require("../controllers/wishlistController");
const authenticateToken = require("../middleware/authenticateToken");

const router = express.Router();

router.use(authenticateToken);
router.get("/wishlist", wishlistController.getWishlist);
router.post("/wishlist/items", wishlistController.addWishlistItem);
router.delete(
  "/wishlist/items/:productId",
  wishlistController.removeWishlistItem
);

module.exports = router;
