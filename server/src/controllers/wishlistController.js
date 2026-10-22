const mongoose = require("../config/mongoose");
const CustomerCollection = require("../../models/customerCollection");
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

async function getOrCreateCollection(userId) {
  let collection = await CustomerCollection.findOne({ user: userId });
  if (!collection) {
    collection = await CustomerCollection.create({ user: userId });
  }
  return collection;
}

const getWishlist = asyncHandler(async (req, res) => {
  const collection = await CustomerCollection.findOne({ user: req.auth.userId })
    .populate("wishlist");
  return res.json({ wishlist: (collection?.wishlist || []).filter(Boolean) });
});

const addWishlistItem = asyncHandler(async (req, res) => {
  const productId = getProductId(req.body?.productId);
  if (!(await Product.exists({ _id: productId }))) {
    return res.status(404).json({ message: "Product not found" });
  }

  const collection = await getOrCreateCollection(req.auth.userId);
  if (!collection.wishlist.some((id) => String(id) === productId)) {
    collection.wishlist.push(productId);
    await collection.save();
  }
  return res.status(200).json({ message: "Wishlist updated" });
});

const removeWishlistItem = asyncHandler(async (req, res) => {
  const productId = getProductId(req.params.productId);
  const collection = await CustomerCollection.findOne({ user: req.auth.userId });
  if (!collection) {
    return res.status(404).json({ message: "Wishlist item not found" });
  }

  const originalLength = collection.wishlist.length;
  collection.wishlist = collection.wishlist.filter(
    (id) => String(id) !== productId
  );
  if (collection.wishlist.length === originalLength) {
    return res.status(404).json({ message: "Wishlist item not found" });
  }

  await collection.save();
  return res.status(204).end();
});

module.exports = {
  addWishlistItem,
  getWishlist,
  removeWishlistItem,
};
