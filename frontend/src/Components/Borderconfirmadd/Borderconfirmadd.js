import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

import Bfooter from "../Bfooter/Bfooter";
import Bheader from "../Bheader/Bheader";
import "./Borderconfirmadd.css";

const URL = "http://localhost:5000/confirmb";

function AddConfirmb() {
  const navigate = useNavigate();
  const location = useLocation();
  const cropInfo = location.state || {};

  const today = new Date().toISOString().split("T")[0];

  const [inputs, setInputs] = useState({
    buyerId: "",
    farmerId: cropInfo.farmerId || "",
    cropId: cropInfo.cropName || "",
    pricePerKg: cropInfo.pricePerKg || 0,
    quantity: "",
    unit: "kg",
    totalPrice: 0,
    paymentMethod: "bank",
    deliveryaddress: "",
    orderdate: today,
    status: "pending"
  });

  useEffect(() => {
    const total = inputs.quantity * inputs.pricePerKg;
    setInputs(prev => ({ ...prev, totalPrice: total }));
  }, [inputs.quantity, inputs.pricePerKg]);

  const handleChange = (e) => {
    setInputs(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const sendRequest = async () => {
    return await axios.post(URL, inputs);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (inputs.buyerId.length !== 12) {
      alert("NIC must be exactly 12 digits.");
      return;
    }

    if (inputs.quantity <= 0) {
      alert("Quantity must be a positive number.");
      return;
    }

    try {
      await sendRequest();
      alert("Order added successfully! Farmer will review your order.");
      navigate("/confirmorder");
    } catch (err) {
      console.error(err);
      alert("Failed to add order. Please try again.");
    }
  };

  return (
    <div>
      <Bheader />

      {/* 🔹 Page container */}
      <div className="byaddorder-page">

        {/* 🔹 Banner Section */}
        <div className="byorder-banner">
          <h1>Add Order Form</h1>
        </div>

        {/* 🔹 Form Card Section */}
        <div className="byorder-card">
          
          <div className="byform-and-extra-buttons">
            <form className="byorder-form" onSubmit={handleSubmit}>
               
              <label>Buyer NIC:</label>
              <input
                type="text"
                name="buyerId"
                value={inputs.buyerId}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  if (value.length <= 12) {
                    setInputs(prev => ({ ...prev, buyerId: value }));
                  }
                }}
                required
                placeholder="Enter 12-digit NIC"
              />

              <label>Farmer Phone Number:</label>
              <input type="text" name="farmerId" value={inputs.farmerId} readOnly />

              <label>Crop Name:</label>
              <input type="text" name="cropId" value={inputs.cropId} readOnly />

              <label>Price Per 1kg (Rs.):</label>
              <input type="number" name="pricePerKg" value={inputs.pricePerKg} readOnly />

              <label>Quantity:</label>
              <input
                type="number"
                name="quantity"
                value={inputs.quantity}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setInputs(prev => ({ ...prev, quantity: value >= 1 ? value : "" }));
                }}
                min="1"
                required
              />

              <label>Unit:</label>
              <select name="unit" value={inputs.unit} onChange={handleChange}>
                <option value="kg">kg</option>
                <option value="ton">ton</option>
              </select>

              <label>Total Amount (LKR):</label>
              <input type="number" name="totalPrice" value={inputs.totalPrice} readOnly />

              <label>Payment Method:</label>
              <select name="paymentMethod" value={inputs.paymentMethod} onChange={handleChange}>
                <option value="cash on delivery">Cash On Delivery</option>
                <option value="bank">Bank</option>
              </select>

              <label>Delivery Address:</label>
              <textarea
                name="deliveryaddress"
                value={inputs.deliveryaddress}
                onChange={handleChange}
                rows="4"
              />

              <label>Date of Order:</label>
              <input
                type="date"
                name="orderdate"
                value={inputs.orderdate}
                onChange={handleChange}
              />

              {/* 🔹 Buttons inside card */}
              <div className="byorder-buttons">
                <div className="byback-buttons">
                  <button type="button" onClick={() => navigate(-1)}>Back</button>
                </div>
                <div className="byaor-buttons">
                  <button type="submit">Add Order</button>
                </div>
              </div>

            </form>
          </div>
        </div>
      </div>

      <Bfooter />
    </div>
  );
}

export default AddConfirmb;