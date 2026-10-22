const express = require("express");
const ordersController = require("../controllers/ordersController");
const authenticateToken = require("../middleware/authenticateToken");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();

router.use(authenticateToken);
router.get("/my", ordersController.getMyOrders);
router.get("/", ordersController.getMyOrders);
router.get("/admin/all", requireAdmin, ordersController.getAllOrders);
router.post("/", ordersController.createOrder);
router.post(
  "/:id/verify-payment",
  ordersController.validateOrderId,
  ordersController.verifyPayment
);
router.patch(
  "/:id/status",
  requireAdmin,
  ordersController.validateOrderId,
  ordersController.updateOrderStatus
);
router.get(
  "/:id",
  ordersController.validateOrderId,
  ordersController.getOrderById
);
router.patch(
  "/:id",
  ordersController.validateOrderId,
  ordersController.updateOrder
);
router.delete(
  "/:id",
  ordersController.validateOrderId,
  ordersController.cancelOrder
);

module.exports = router;
