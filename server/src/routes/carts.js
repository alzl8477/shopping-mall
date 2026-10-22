const express = require("express");
const cartsController = require("../controllers/cartsController");
const authenticateToken = require("../middleware/authenticateToken");

const router = express.Router();

router.use(authenticateToken);
router.get("/", cartsController.getCart);
router.post("/items", cartsController.addCartItem);
router.patch("/items/:productId", cartsController.updateCartItem);
router.delete("/items", cartsController.removeCartItems);
router.delete("/items/:productId", cartsController.removeCartItem);
router.delete("/", cartsController.clearCart);

module.exports = router;
