const mongoose = require("mongoose");

const confirmbSchema = new mongoose.Schema({
  buyerId: { type: String, required: true },
  farmerId: { type: String, required: true },
  cropId: { type: String, required: true },
  pricePerKg: { type: Number, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, default: "kg" },
  totalPrice: { type: Number, required: true },
  paymentMethod: {
    type: String,
    enum: ["cash on delivery", "bank"],
    default: "bank",
  },
  deliveryaddress: { type: String, required: true },
  orderdate: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
  isPaid: {
    type: Boolean,
    default: false,
  },
});

// Middleware to calculate totalPrice
confirmbSchema.pre("save", function (next) {
  if (this.quantity && this.pricePerKg) {
    this.totalPrice = this.quantity * this.pricePerKg;
  }
  next();
});

// JSON transformation
confirmbSchema.set("toJSON", {
  transform: (doc, ret) => {
    if (ret.orderdate) {
      ret.orderdate = new Date(ret.orderdate).toISOString().split("T")[0];
    }
    return ret;
  },
});

module.exports = mongoose.model("ConfirmbModel", confirmbSchema);