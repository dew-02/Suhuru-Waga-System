import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Bfooter from "../Bfooter/Bfooter";
import Bheader from '../Bheader/Bheader';
import "./Bpaymentadd.css"; 

function Bpaymentadd() {
  const navigate = useNavigate();
  const location = useLocation();
  const { order } = location.state || {}; // Receive order object from Borderconfirmdisplay

  const [inputs, setInputs] = useState({
    payment_id: order?.buyerId || "", // Pre-fill Buyer NIC
    company_name: "",                  // User enters company name
    amount: order?.totalPrice || "",  // Pre-fill amount
    payment_method: "card",
    bank_receipt: null,
    order_pdf: null,
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setInputs(prev => ({ ...prev, [name]: files[0] }));
    } else {
      setInputs(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("payment_id", inputs.payment_id);
    fd.append("company_name", inputs.company_name);
    fd.append("amount", inputs.amount);
    fd.append("payment_method", inputs.payment_method);
    if (inputs.bank_receipt) fd.append("bank_receipt", inputs.bank_receipt);
    if (inputs.order_pdf) fd.append("order_pdf", inputs.order_pdf);

    try {
      await axios.post("http://localhost:5000/api/payments", fd);
      alert("Payment created successfully!");
      navigate("/bpaydisplay");
    } catch (err) {
      alert("Error creating payment: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div>
      <Bheader />
      
      {/* Banner */}
      <div className="payment-banner">
        <h1>Add Payment</h1>
      </div>

      {/* Page Container */}
      <div className="payment-page">
        <form className="payment-form" onSubmit={handleSubmit} encType="multipart/form-data">
          
          {/* Buyer NIC */}
          <div className="form-row">
            <label>Buyer NIC:</label>
            <input type="text" name="payment_id" value={inputs.payment_id} readOnly />
          </div>

          {/* Company Name */}
          <div className="form-row">
            <label>Company Name:</label>
            <input type="text" name="company_name" value={inputs.company_name} onChange={handleChange} required />
          </div>

          {/* Amount */}
          <div className="form-row">
            <label>Amount (LKR):</label>
            <input type="number" step="1000" name="amount" value={inputs.amount} readOnly />
          </div>

          {/* Payment Method */}
          <div className="form-row">
            <label>Payment Method:</label>
            <select name="payment_method" value={inputs.payment_method} onChange={handleChange}>
              <option value="cash">Cash</option>
              <option value="card">Banking</option>
              <option value="online">Online Transfer</option>
            </select>
          </div>

          {/* Bank Receipt */}
          <div className="form-row">
            <label>Bank Receipt (jpg, png, pdf):</label>
            <input type="file" name="bank_receipt" accept=".jpg,.jpeg,.png,.pdf" onChange={handleChange} />
          </div>

          {/* Order PDF */}
          <div className="form-row">
            <label>Order PDF:</label>
            <input type="file" name="order_pdf" accept=".pdf" onChange={handleChange} />
          </div>

          {/* Submit Button */}
          <button type="submit">Add Payment</button>
        </form>
      </div>
      
      <Bfooter />
    </div>
  );
}

export default Bpaymentadd;