const cors = require("cors");
const express = require("express");
const connectDatabase = require("./src/config/database");
const healthRouter = require("./src/routes/health");
const usersRouter = require("./src/routes/users");
const productsRouter = require("./src/routes/products");
const accountCollectionRouter = require("./src/routes/accountCollection");
const cartsRouter = require("./src/routes/carts");
const ordersRouter = require("./src/routes/orders");

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());
app.use("/api", (req, res, next) => {
  connectDatabase().then(() => next(), next);
});
app.use("/api/health", healthRouter);
app.use("/api/users", usersRouter);
app.use("/api/products", productsRouter);
app.use("/api/account/collection", accountCollectionRouter);
app.use("/api/carts", cartsRouter);
app.use("/api/orders", ordersRouter);

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error.code === 11000) {
    if (error.keyPattern?.sku || error.keyValue?.sku) {
      return res.status(409).json({ message: "SKU already exists" });
    }
    if (error.keyPattern?.orderNumber || error.keyValue?.orderNumber) {
      return res.status(409).json({ message: "Order number already exists" });
    }
    if (error.keyPattern?.checkoutId || error.keyValue?.checkoutId) {
      return res.status(409).json({ message: "Checkout request already exists" });
    }
    return res.status(409).json({ message: "Email or user ID already exists" });
  }

  if (error.name === "ValidationError") {
    const errors = Object.fromEntries(
      Object.entries(error.errors).map(([field, fieldError]) => [
        field,
        fieldError.message,
      ])
    );
    return res.status(400).json({ message: "Validation failed", errors });
  }

  if (error.status === 502 || error.status === 503) {
    return res.status(error.status).json({ message: error.message });
  }

  if (error.status === 400 || error.name === "CastError" || error.type === "entity.parse.failed") {
    return res.status(400).json({ message: error.message || "Invalid request" });
  }

  console.error("API request failed:", error);
  return res.status(500).json({ message: "Internal server error" });
});

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

module.exports = app;
