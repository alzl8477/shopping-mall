const mongoose = require("../config/mongoose");
const { isSandboxAllowed } = require("../config/portoneSandbox");
const Order = require("../../models/order");
const Product = require("../../models/product");

const paymentMethods = [
  "card",
  "bank_transfer",
  "virtual_account",
  "mobile",
  "other",
];
const portOneMethods = {
  card: ["card", "point"], // 간편결제는 pay_method가 point로 올 수 있음
  bank_transfer: ["trans"],
  virtual_account: ["vbank"],
  mobile: ["phone"],
};
const orderStatuses = ["pending", "confirmed", "cancelled", "completed"];
const fulfillmentStatuses = [
  "pending",
  "preparing",
  "shipped",
  "delivered",
  "returned",
];
let cachedPortOneToken;
let cachedPortOneTokenExpiresAt = 0;

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function getObjectBody(body, allowedFields, name) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw badRequest(`${name} must be a JSON object`);
  }

  const unknownFields = Object.keys(body).filter(
    (field) => !allowedFields.includes(field)
  );
  if (unknownFields.length > 0) {
    throw badRequest(`Unknown ${name} field(s): ${unknownFields.join(", ")}`);
  }
  return body;
}

function getRequiredString(value, field, maxLength) {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.trim().length > maxLength
  ) {
    throw badRequest(`${field} must be a non-empty string up to ${maxLength} characters`);
  }
  return value.trim();
}

function getOptionalString(value, field, maxLength) {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value !== "string" || value.trim().length > maxLength) {
    throw badRequest(`${field} must be a string up to ${maxLength} characters`);
  }
  return value.trim();
}

async function getPortOneAccessToken({ forceRefresh = false } = {}) {
  if (
    !forceRefresh &&
    cachedPortOneToken &&
    cachedPortOneTokenExpiresAt > Date.now() + 60_000
  ) {
    return cachedPortOneToken;
  }

  const { PORTONE_API_KEY: impKey, PORTONE_API_SECRET: impSecret } = process.env;
  if (!impKey || !impSecret) {
    const error = new Error("PortOne API credentials are not configured");
    error.status = 503;
    throw error;
  }

  const response = await fetch("https://api.iamport.kr/users/getToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imp_key: impKey, imp_secret: impSecret }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.code !== 0 || !result.response?.access_token) {
    const details = result?.message || result?.error || `HTTP ${response.status}`;
    console.error("[verifyPayment] PortOne token request failed:", {
      httpStatus: response.status,
      code: result?.code,
      message: details,
    });
    const error = new Error(`PortOne token request failed: ${details}`);
    error.status = 502;
    throw error;
  }

  cachedPortOneToken = result.response.access_token;
  cachedPortOneTokenExpiresAt = Number(result.response.expired_at) * 1000;
  return cachedPortOneToken;
}

async function getPortOnePayment(impUid) {
  const sandboxQuery = isSandboxAllowed() ? "?include_sandbox=true" : "";
  const paymentUrl = `https://api.iamport.kr/payments/${encodeURIComponent(impUid)}${sandboxQuery}`;
  let accessToken = await getPortOneAccessToken();
  let response = await fetch(paymentUrl, {
    headers: { Authorization: accessToken },
  });
  let result = await response.json().catch(() => null);

  if (response.status === 401) {
    accessToken = await getPortOneAccessToken({ forceRefresh: true });
    response = await fetch(paymentUrl, {
      headers: { Authorization: accessToken },
    });
    result = await response.json().catch(() => null);
  }

  if (!response.ok || result?.code !== 0 || !result.response) {
    const details = result?.message || result?.error || `HTTP ${response.status}`;
    const code = Number.isInteger(result?.code) ? ` (PortOne code ${result.code})` : "";
    console.error("[verifyPayment] PortOne payment lookup failed:", {
      impUid,
      httpStatus: response.status,
      code: result?.code,
      message: details,
    });
    const error = new Error(`PortOne payment lookup failed${code}: ${details}`);
    error.status = 502;
    throw error;
  }
  return result.response;
}

function getShippingAddress(value) {
  const address = getObjectBody(
    value,
    ["recipientName", "phone", "email", "postalCode", "address1", "address2", "deliveryNote"],
    "shippingAddress"
  );
  const email = getRequiredString(address.email, "email", 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw badRequest("email must be a valid email address");
  }

  return {
    recipientName: getRequiredString(address.recipientName, "recipientName", 100),
    phone: getRequiredString(address.phone, "phone", 32),
    email,
    postalCode: getRequiredString(address.postalCode, "postalCode", 16),
    address1: getRequiredString(address.address1, "address1", 200),
    address2: getOptionalString(address.address2, "address2", 200),
    deliveryNote: getOptionalString(address.deliveryNote, "deliveryNote", 500),
  };
}

function getOrderItems(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) {
    throw badRequest("items must contain between 1 and 100 items");
  }

  return value.map((item, index) => {
    const input = getObjectBody(
      item,
      ["productId", "quantity", "size", "color"],
      `items[${index}]`
    );
    if (
      typeof input.productId !== "string" ||
      !mongoose.isValidObjectId(input.productId)
    ) {
      throw badRequest(`items[${index}].productId must be a valid product ID`);
    }
    if (!Number.isSafeInteger(input.quantity) || input.quantity < 1) {
      throw badRequest(`items[${index}].quantity must be a positive integer`);
    }

    return {
      productId: input.productId,
      quantity: input.quantity,
      size: getOptionalString(input.size, `items[${index}].size`, 64),
      color: getOptionalString(input.color, `items[${index}].color`, 64),
    };
  });
}

function validateOrderId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid order ID" });
  }
  return next();
}

const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.auth.userId }).sort({
    createdAt: -1,
    _id: -1,
  });
  return res.json(orders);
});

const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find()
    .populate("user", "name email")
    .sort({ createdAt: -1, _id: -1 });
  return res.json(orders);
});

const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    user: req.auth.userId,
  });
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }
  return res.json(order);
});

const createOrder = asyncHandler(async (req, res) => {
  const input = getObjectBody(
    req.body,
    ["items", "shippingAddress", "paymentMethod", "checkoutId"],
    "order"
  );
  const checkoutId = getRequiredString(input.checkoutId, "checkoutId", 100);
  const existingOrder = await Order.findOne({
    user: req.auth.userId,
    checkoutId,
  });
  if (existingOrder) {
    if (existingOrder.payment.status === "paid") {
      return res.status(409).json({
        message: "This checkout has already been paid.",
      });
    }
    if (existingOrder.orderStatus === "cancelled") {
      return res.status(409).json({
        message: "This checkout attempt was cancelled. Start a new checkout.",
      });
    }
    return res.status(200).json(existingOrder);
  }

  const requestedItems = getOrderItems(input.items);
  const shippingAddress = getShippingAddress(input.shippingAddress);
  const paymentMethod = input.paymentMethod ?? "other";
  if (!paymentMethods.includes(paymentMethod)) {
    throw badRequest(`paymentMethod must be one of: ${paymentMethods.join(", ")}`);
  }

  const productIds = [...new Set(requestedItems.map((item) => item.productId))];
  const products = await Product.find({ _id: { $in: productIds } }).select(
    "_id sku name image price"
  );
  const productsById = new Map(
    products.map((product) => [String(product._id), product])
  );
  const missingProduct = requestedItems.find(
    (item) => !productsById.has(item.productId)
  );
  if (missingProduct) {
    return res.status(404).json({
      message: `Product not found: ${missingProduct.productId}`,
    });
  }

  const items = requestedItems.map((item) => {
    const product = productsById.get(item.productId);
    return {
      product: product._id,
      sku: product.sku,
      name: product.name,
      image: product.image,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
      unitPrice: product.price,
      lineTotal: product.price * item.quantity,
    };
  });
  if (items.some((item) => !Number.isFinite(item.lineTotal))) {
    throw badRequest("Order item total is outside the supported range");
  }

  let order;
  let created = true;
  try {
    order = await Order.create({
      user: req.auth.userId,
      checkoutId,
      items,
      shippingAddress,
      payment: { method: paymentMethod, status: "pending" },
    });
  } catch (error) {
    if (error.code !== 11000 || !error.keyPattern?.checkoutId) {
      throw error;
    }
    order = await Order.findOne({ user: req.auth.userId, checkoutId });
    if (!order) {
      throw error;
    }
    created = false;
  }
  return res.status(created ? 201 : 200).json(order);
});

const verifyPayment = asyncHandler(async (req, res) => {
  const input = getObjectBody(req.body, ["impUid"], "payment verification");
  const impUid = getRequiredString(input.impUid, "impUid", 128);
  const order = await Order.findOne({
    _id: req.params.id,
    user: req.auth.userId,
  });
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }
  if (order.payment.status === "paid") {
    if (order.payment.transactionId !== impUid) {
      return res.status(409).json({ message: "Order was paid with another transaction" });
    }
    return res.json({ verified: true, order });
  }
  if (order.orderStatus !== "pending" || order.payment.status !== "pending") {
    return res.status(409).json({ message: "Order is not awaiting payment" });
  }

  const payment = await getPortOnePayment(impUid);
  const paymentMatchesOrder =
    payment.merchant_uid === order.orderNumber &&
    Number(payment.amount) === order.totalAmount &&
    Boolean(portOneMethods[order.payment.method]?.includes(payment.pay_method)) &&
    (!payment.currency || payment.currency === order.currency);
  if (!paymentMatchesOrder) {
    console.warn("[verifyPayment] PortOne payment does not match order:", {
      orderNumber: order.orderNumber,
      impUid,
      merchant_uid: { expected: order.orderNumber, actual: payment.merchant_uid },
      amount: { expected: order.totalAmount, actual: payment.amount },
      pay_method: { expected: portOneMethods[order.payment.method]?.join("|"), actual: payment.pay_method },
      currency: { expected: order.currency, actual: payment.currency },
      status: payment.status,
    });
    return res.status(409).json({
      message: "PortOne payment does not match the pending order.",
    });
  }
  if (payment.status === "ready" && order.payment.method === "virtual_account") {
    order.payment.provider = "portone";
    order.payment.transactionId = impUid;
    await order.save();
    return res.status(202).json({ pending: true, order });
  }
  if (payment.status !== "paid") {
    console.warn("[verifyPayment] PortOne payment is not paid:", {
      orderNumber: order.orderNumber,
      impUid,
      status: payment.status,
      fail_reason: payment.fail_reason,
    });
    return res.status(409).json({
      message: "PortOne payment does not match the pending order.",
    });
  }

  const paidAt = Number.isFinite(Number(payment.paid_at)) && Number(payment.paid_at) > 0
    ? new Date(Number(payment.paid_at) * 1000)
    : new Date();
  const verifiedOrder = await Order.findOneAndUpdate(
    {
      _id: order._id,
      user: req.auth.userId,
      orderStatus: "pending",
      "payment.status": "pending",
    },
    {
      $set: {
        orderStatus: "confirmed",
        "payment.status": "paid",
        "payment.provider": "portone",
        "payment.transactionId": impUid,
        "payment.paidAt": paidAt,
      },
    },
    { new: true }
  );
  if (!verifiedOrder) {
    const latestOrder = await Order.findOne({
      _id: order._id,
      user: req.auth.userId,
    });
    if (
      latestOrder?.payment.status === "paid" &&
      latestOrder.payment.transactionId === impUid
    ) {
      return res.json({ verified: true, order: latestOrder });
    }
    return res.status(409).json({ message: "Order payment state changed during verification" });
  }

  return res.json({ verified: true, order: verifiedOrder });
});

const updateOrder = asyncHandler(async (req, res) => {
  const input = getObjectBody(req.body, ["shippingAddress"], "order");
  if (!Object.hasOwn(input, "shippingAddress")) {
    throw badRequest("shippingAddress is required");
  }

  const order = await Order.findOne({
    _id: req.params.id,
    user: req.auth.userId,
  });
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }
  if (order.orderStatus !== "pending" || order.payment.status !== "pending") {
    return res.status(409).json({
      message: "Shipping address can only be changed before order confirmation and payment",
    });
  }

  order.shippingAddress = getShippingAddress(input.shippingAddress);
  await order.save();
  return res.json(order);
});

const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    user: req.auth.userId,
  });
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }
  if (order.orderStatus !== "pending" || order.payment.status !== "pending") {
    return res.status(409).json({
      message: "Only unpaid, unconfirmed orders can be cancelled",
    });
  }

  order.orderStatus = "cancelled";
  order.cancelledAt = new Date();
  await order.save();
  return res.json({ message: "Order cancelled", order });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const input = getObjectBody(
    req.body,
    ["orderStatus", "fulfillmentStatus"],
    "order status"
  );
  if (Object.keys(input).length === 0) {
    throw badRequest("At least one order status field must be provided");
  }
  if (
    input.orderStatus !== undefined &&
    !orderStatuses.includes(input.orderStatus)
  ) {
    throw badRequest(`orderStatus must be one of: ${orderStatuses.join(", ")}`);
  }
  if (
    input.fulfillmentStatus !== undefined &&
    !fulfillmentStatuses.includes(input.fulfillmentStatus)
  ) {
    throw badRequest(
      `fulfillmentStatus must be one of: ${fulfillmentStatuses.join(", ")}`
    );
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  if (input.orderStatus !== undefined) {
    order.orderStatus = input.orderStatus;
    if (input.orderStatus === "cancelled" && !order.cancelledAt) {
      order.cancelledAt = new Date();
    }
  }
  if (input.fulfillmentStatus !== undefined) {
    order.fulfillmentStatus = input.fulfillmentStatus;
    if (input.fulfillmentStatus === "shipped" && !order.shippedAt) {
      order.shippedAt = new Date();
    }
    if (input.fulfillmentStatus === "delivered" && !order.deliveredAt) {
      order.deliveredAt = new Date();
    }
  }

  await order.save();
  return res.json(order);
});

module.exports = {
  cancelOrder,
  createOrder,
  getAllOrders,
  getOrderById,
  getMyOrders,
  updateOrder,
  updateOrderStatus,
  validateOrderId,
  verifyPayment,
};
