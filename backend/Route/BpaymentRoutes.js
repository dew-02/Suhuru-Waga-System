const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const paymentController = require("../Controlers/BpaymentController");

// -------------------- Multer Config --------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // store files in /uploads
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// -------------------- Routes --------------------

// CREATE Payment (with file uploads)
router.post(
  "/",
  upload.fields([
    { name: "bank_receipt", maxCount: 1 },
    { name: "order_pdf", maxCount: 1 },
  ]),
  paymentController.createPayment
);

// READ All
router.get("/", paymentController.getPayments);

// READ One
router.get("/:id", paymentController.getPaymentById);

// UPDATE (with optional new files)
router.put(
  "/:id",
  upload.fields([
    { name: "bank_receipt", maxCount: 1 },
    { name: "order_pdf", maxCount: 1 },
  ]),
  paymentController.updatePayment
);

// VERIFY Payment (Farmer/Admin action)
router.put("/:id/verify", paymentController.verifyPayment);

// DELETE
router.delete("/:id", paymentController.deletePayment);

module.exports = router;