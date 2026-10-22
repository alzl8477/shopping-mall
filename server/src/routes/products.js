const express = require("express");
const productsController = require("../controllers/productsController");
const authenticateToken = require("../middleware/authenticateToken");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();
const requireAdminAccess = [authenticateToken, requireAdmin];

router.get("/", productsController.getProducts);
router.post("/", ...requireAdminAccess, productsController.createProduct);
router.get(
  "/:id",
  productsController.validateProductId,
  productsController.getProductById
);
router.put(
  "/:id",
  ...requireAdminAccess,
  productsController.validateProductId,
  productsController.replaceProduct
);
router.patch(
  "/:id",
  ...requireAdminAccess,
  productsController.validateProductId,
  productsController.patchProduct
);
router.delete(
  "/:id",
  ...requireAdminAccess,
  productsController.validateProductId,
  productsController.deleteProduct
);

module.exports = router;
