const mongoose = require("../config/mongoose");
const Product = require("../../models/product");

const productFields = [
  "sku",
  "name",
  "price",
  "category",
  "image",
  "description",
];

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function getProductInput(body, { partial = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    const error = new Error("Request body must be a JSON object");
    error.status = 400;
    throw error;
  }

  const unknownFields = Object.keys(body).filter(
    (field) => !productFields.includes(field)
  );
  if (unknownFields.length > 0) {
    const error = new Error(
      `Unknown product field(s): ${unknownFields.join(", ")}`
    );
    error.status = 400;
    throw error;
  }

  const input = {};
  for (const field of productFields) {
    if (Object.hasOwn(body, field)) {
      input[field] = body[field];
    }
  }

  if (partial && Object.keys(input).length === 0) {
    const error = new Error("At least one product field must be provided");
    error.status = 400;
    throw error;
  }

  return input;
}

function validateProductId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid product ID" });
  }

  return next();
}

const getProducts = asyncHandler(async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  return res.json(products);
});

const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  return res.json(product);
});

const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(getProductInput(req.body));
  return res.status(201).json(product);
});

const replaceProduct = asyncHandler(async (req, res) => {
  const productData = getProductInput(req.body);
  const missingFields = productFields.filter(
    (field) => !Object.hasOwn(productData, field)
  );
  if (missingFields.length > 0) {
    const error = new Error(
      `Missing required field(s): ${missingFields.join(", ")}`
    );
    error.status = 400;
    throw error;
  }

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { $set: productData },
    { new: true, runValidators: true }
  );
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  return res.json(product);
});

const patchProduct = asyncHandler(async (req, res) => {
  const updates = getProductInput(req.body, { partial: true });
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  );
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  return res.json(product);
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  return res.status(204).end();
});

module.exports = {
  createProduct,
  deleteProduct,
  getProductById,
  getProducts,
  patchProduct,
  replaceProduct,
  validateProductId,
};
