const { randomUUID } = require("crypto");
const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isSafeInteger,
    },
    size: {
      type: String,
      trim: true,
      maxlength: 64,
      default: "",
    },
    color: {
      type: String,
      trim: true,
      maxlength: 64,
      default: "",
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    recipientName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 32,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    postalCode: {
      type: String,
      required: true,
      trim: true,
      maxlength: 16,
    },
    address1: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    address2: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
    deliveryNote: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ["card", "bank_transfer", "virtual_account", "mobile", "other"],
      default: "other",
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled", "refunded"],
      default: "pending",
    },
    provider: {
      type: String,
      trim: true,
      default: "",
    },
    transactionId: {
      type: String,
      trim: true,
      default: "",
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      default: () => `ML-${randomUUID().toUpperCase()}`,
    },
    checkoutId: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "An order must contain at least one item",
      },
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    shippingFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    discountAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    totalItems: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isSafeInteger,
      default: 0,
    },
    currency: {
      type: String,
      enum: ["KRW"],
      default: "KRW",
    },
    orderStatus: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },
    payment: {
      type: paymentSchema,
      default: () => ({}),
    },
    fulfillmentStatus: {
      type: String,
      enum: ["pending", "preparing", "shipped", "delivered", "returned"],
      default: "pending",
    },
    shippedAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  { timestamps: true }
);

orderSchema.pre("validate", function calculateOrderTotals() {
  this.totalItems = this.items.reduce((total, item) => total + item.quantity, 0);
  this.subtotal = this.items.reduce((total, item) => {
    item.lineTotal = item.unitPrice * item.quantity;
    return total + item.lineTotal;
  }, 0);

  if (this.discountAmount > this.subtotal) {
    this.invalidate("discountAmount", "Discount cannot exceed the item subtotal");
    return;
  }

  this.totalAmount = this.subtotal + this.shippingFee - this.discountAmount;
});

orderSchema.index(
  { user: 1, checkoutId: 1 },
  {
    unique: true,
    partialFilterExpression: { checkoutId: { $type: "string" } },
  }
);

module.exports = mongoose.model("Order", orderSchema);
