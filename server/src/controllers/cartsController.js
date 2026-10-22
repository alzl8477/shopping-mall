const mongoose = require("../config/mongoose");
const CustomerCollection = require("../../models/customerCollection");
const Cart = require("../../models/cart");
const Product = require("../../models/product");

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function getProductId(value) {
  if (typeof value !== "string" || !mongoose.isValidObjectId(value)) {
    const error = new Error("A valid productId is required");
    error.status = 400;
    throw error;
  }
  return value;
}

function getCartOption(value, field) {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value !== "string" || value.trim().length > 64) {
    const error = new Error(`${field} must be a string up to 64 characters`);
    error.status = 400;
    throw error;
  }
  return value.trim();
}

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    const legacyCollection = await CustomerCollection.collection.findOne(
      { user: new mongoose.Types.ObjectId(userId) },
      { projection: { cart: 1 } }
    );
    const legacyItems = Array.isArray(legacyCollection?.cart)
      ? legacyCollection.cart
      : [];
    const products = await Product.find({
      _id: { $in: legacyItems.map((item) => item.product) },
    }).select("_id price");
    const productPrices = new Map(
      products.map((product) => [String(product._id), product.price])
    );
    const migratedItems = legacyItems
      .filter((item) => productPrices.has(String(item.product)))
      .map((item) => ({
        product: item.product,
        quantity: item.quantity,
        price: productPrices.get(String(item.product)),
      }));

    try {
      cart = await Cart.create({ user: userId, items: migratedItems });
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }
      cart = await Cart.findOne({ user: userId });
      if (!cart) {
        throw error;
      }
    }

    if (legacyItems.length > 0) {
      await CustomerCollection.collection.updateOne(
        { user: new mongoose.Types.ObjectId(userId) },
        { $unset: { cart: "" } }
      );
    }
  }

  const itemsNeedingPrice = cart.items.filter(
    (item) => typeof item.price !== "number" || !Number.isFinite(item.price)
  );
  if (itemsNeedingPrice.length > 0) {
    const products = await Product.find({
      _id: { $in: itemsNeedingPrice.map((item) => item.product) },
    }).select("_id price");
    const productPrices = new Map(
      products.map((product) => [String(product._id), product.price])
    );
    cart.items = cart.items
      .filter((item) => productPrices.has(String(item.product)))
      .map((item) => ({
        product: item.product,
        quantity: item.quantity,
        size: item.size || "",
        color: item.color || "",
        price: Number.isFinite(item.price)
          ? item.price
          : productPrices.get(String(item.product)),
      }));
    await cart.save();
  }

  return cart;
}

const getCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.auth.userId);
  await cart.populate("items.product");

  return res.json({
    items: cart.items
      .filter((item) => item.product)
      .map((item) => ({
        product: item.product,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        price: item.price,
        amount: item.price * item.quantity,
      })),
    totalAmount: cart.totalAmount,
    totalItems: cart.totalItems,
  });
});

const addCartItem = asyncHandler(async (req, res) => {
  const productId = getProductId(req.body?.productId);
  const quantity = req.body?.quantity ?? 1;
  const size = getCartOption(req.body?.size, "size");
  const color = getCartOption(req.body?.color, "color");
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    return res.status(400).json({ message: "quantity must be a positive integer" });
  }

  const product = await Product.findById(productId).select("price");
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  const cart = await getOrCreateCart(req.auth.userId);
  const existingItem = cart.items.find(
    (item) =>
      String(item.product) === productId &&
      (item.size || "") === size &&
      (item.color || "") === color
  );
  if (existingItem) {
    const nextQuantity = existingItem.quantity + quantity;
    if (!Number.isSafeInteger(nextQuantity)) {
      return res.status(400).json({ message: "quantity is too large" });
    }
    existingItem.quantity = nextQuantity;
  } else {
    cart.items.push({
      product: productId,
      quantity,
      size,
      color,
      price: product.price,
    });
  }
  await cart.save();

  return res.status(200).json({
    message: "Cart updated",
    totalAmount: cart.totalAmount,
    totalItems: cart.totalItems,
  });
});

const updateCartItem = asyncHandler(async (req, res) => {
  const productId = getProductId(req.params.productId);
  const quantity = req.body?.quantity;
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    return res.status(400).json({ message: "quantity must be a positive integer" });
  }

  const cart = await Cart.findOne({ user: req.auth.userId });
  const item = cart?.items.find(
    (cartItem) => String(cartItem.product) === productId
  );
  if (!item) {
    return res.status(404).json({ message: "Cart item not found" });
  }

  item.quantity = quantity;
  await cart.save();
  return res.json({
    message: "Cart updated",
    totalAmount: cart.totalAmount,
    totalItems: cart.totalItems,
  });
});

const removeCartItem = asyncHandler(async (req, res) => {
  const productId = getProductId(req.params.productId);
  const hasVariant = Object.hasOwn(req.query, "size") || Object.hasOwn(req.query, "color");
  const size = getCartOption(req.query.size, "size");
  const color = getCartOption(req.query.color, "color");
  const cart = await Cart.findOne({ user: req.auth.userId });
  if (!cart) {
    return res.status(404).json({ message: "Cart item not found" });
  }

  const originalLength = cart.items.length;
  cart.items = cart.items.filter(
    (item) =>
      String(item.product) !== productId ||
      (hasVariant && (item.size || "") !== size) ||
      (hasVariant && (item.color || "") !== color)
  );
  if (cart.items.length === originalLength) {
    return res.status(404).json({ message: "Cart item not found" });
  }

  await cart.save();
  return res.json({
    message: "Cart item removed",
    totalAmount: cart.totalAmount,
    totalItems: cart.totalItems,
  });
});

const removeCartItems = asyncHandler(async (req, res) => {
  const input = req.body?.items;
  if (!Array.isArray(input) || input.length === 0 || input.length > 100) {
    return res.status(400).json({
      message: "items must contain between 1 and 100 cart lines",
    });
  }

  const lines = input.map((line, index) => {
    const productId = getProductId(line?.productId);
    return {
      product: new mongoose.Types.ObjectId(productId),
      size: getCartOption(line?.size, `items[${index}].size`),
      color: getCartOption(line?.color, `items[${index}].color`),
    };
  });
  const conditions = lines.map((line) => ({
    $and: [
      { $eq: ["$$item.product", line.product] },
      { $eq: [{ $ifNull: ["$$item.size", ""] }, line.size] },
      { $eq: [{ $ifNull: ["$$item.color", ""] }, line.color] },
    ],
  }));

  await Cart.updateOne(
    { user: req.auth.userId },
    [
      {
        $set: {
          items: {
            $filter: {
              input: "$items",
              as: "item",
              cond: { $not: [{ $or: conditions }] },
            },
          },
        },
      },
      {
        $set: {
          totalItems: {
            $sum: {
              $map: {
                input: "$items",
                as: "item",
                in: "$$item.quantity",
              },
            },
          },
          totalAmount: {
            $sum: {
              $map: {
                input: "$items",
                as: "item",
                in: { $multiply: ["$$item.price", "$$item.quantity"] },
              },
            },
          },
        },
      },
    ]
  );

  const cart = await Cart.findOne({ user: req.auth.userId }).select(
    "totalAmount totalItems"
  );
  return res.json({
    message: "Purchased cart items removed",
    totalAmount: cart?.totalAmount ?? 0,
    totalItems: cart?.totalItems ?? 0,
  });
});

const clearCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.auth.userId);
  cart.items = [];
  await cart.save();
  return res.json({
    message: "Cart cleared",
    totalAmount: cart.totalAmount,
    totalItems: cart.totalItems,
  });
});

module.exports = {
  addCartItem,
  clearCart,
  getCart,
  removeCartItem,
  removeCartItems,
  updateCartItem,
};
