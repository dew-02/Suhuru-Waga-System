const Payment = require("../Model/BpaymentModel");

// CREATE Payment
exports.createPayment = async (req, res) => {
  try {
    const { payment_id, company_name, amount, payment_method } = req.body;

    const newPayment = new Payment({
      payment_id,
      company_name,
      amount,
      payment_method,
      bank_receipt: req.files?.bank_receipt ? req.files.bank_receipt[0].path : null,
      order_pdf: req.files?.order_pdf ? req.files.order_pdf[0].path : null,
      isVerified: false, // default not verified
    });

    await newPayment.save();
    res.status(201).json({ message: "Payment created successfully!", payment: newPayment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// READ (All Payments)
exports.getPayments = async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 }); // newest first
    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// READ (One Payment)
exports.getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE Payment
exports.updatePayment = async (req, res) => {
  try {
    const { company_name, amount, payment_method } = req.body;
    const updateData = {
      company_name,
      amount,
      payment_method,
    };

    // Handle new file uploads if present
    if (req.files?.bank_receipt) updateData.bank_receipt = req.files.bank_receipt[0].path;
    if (req.files?.order_pdf) updateData.order_pdf = req.files.order_pdf[0].path;

    const payment = await Payment.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!payment) return res.status(404).json({ error: "Payment not found" });

    res.json({ message: "Payment updated successfully!", payment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// VERIFY Payment (Farmer/Admin action)
exports.verifyPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: "Payment not found" });

    payment.isVerified = true;
    await payment.save();

    res.json({ message: "Payment verified successfully!", payment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE Payment
exports.deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    res.json({ message: "Payment deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};