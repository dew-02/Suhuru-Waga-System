const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  payment_id: { type: String, required: true },   // buyer NIC
  company_name: { type: String, required: true }, // buyer or company name
  amount: { type: Number, required: true },
  payment_method: { type: String, enum: ["cash", "card", "online"], required: true },
  bank_receipt: { type: String }, // file path
  order_pdf: { type: String },    // file path

  // 🔹 New fields
  status: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
  verifiedByFarmer: { type: String, default: null }, // farmer NIC who verified

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("BpaymentModel", paymentSchema);