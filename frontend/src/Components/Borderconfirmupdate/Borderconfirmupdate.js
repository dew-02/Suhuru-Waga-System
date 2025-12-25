import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Bfooter from "../Bfooter/Bfooter";
import Bheader from "../Bheader/Bheader";
import "./Borderconfirmupdate.css";

function Borderconfirmupdate() {
  const navigate = useNavigate();
  const { id } = useParams(); // get order id from URL

  // Safe default state
  const [inputs, setInputs] = useState({
    buyerId: "",
    farmerId: "",
    cropId: "",
    pricePerKg: 0,
    quantity: 0,
    unit: "kg",
    totalPrice: 0,
    paymentMethod: "cash on delivery",
    deliveryaddress: "",
    orderdate: new Date().toISOString().split("T")[0],
  });

  // Fetch order data on component mount
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/confirmb/${id}`);
        if (res.data) {
          // 🔹 Check status first
          if (res.data.status && res.data.status !== "pending") {
            alert("This order cannot be updated because it has been accepted or rejected.");
            navigate("/confirmorder"); // redirect to display page
            return; // stop further execution
          }

          setInputs({
            buyerId: res.data.buyerId || "",
            farmerId: res.data.farmerId || "",
            cropId: res.data.cropId || "",
            pricePerKg: res.data.pricePerKg || 0,
            quantity: res.data.quantity || 0,
            unit: res.data.unit || "kg",
            totalPrice: res.data.totalPrice || 0,
            paymentMethod: res.data.paymentMethod || "cash on delivery",
            deliveryaddress: res.data.deliveryaddress || "",
            orderdate: res.data.orderdate
              ? new Date(res.data.orderdate).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0],
          });
        }
      } catch (err) {
        console.error(err);
        alert("Failed to fetch order data");
      }
    };
    fetchOrder();
  }, [id, navigate]);

  // Update totalPrice whenever quantity or pricePerKg changes
  useEffect(() => {
    const total = inputs.quantity * inputs.pricePerKg;
    setInputs((prev) => ({ ...prev, totalPrice: total }));
  }, [inputs.quantity, inputs.pricePerKg]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // For numeric fields, convert to Number
    if (["quantity", "pricePerKg"].includes(name)) {
      setInputs((prev) => ({ ...prev, [name]: Number(value) }));
    } else {
      setInputs((prev) => ({ ...prev, [name]: value }));
    }
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
      await axios.put(`http://localhost:5000/confirmb/${id}`, inputs);
      alert("Order updated successfully!");
      navigate("/confirmorder"); // go back to display page
    } catch (err) {
      console.error(err);
      alert("Failed to update order");
    }
  };

  return (
    <div>
      <Bheader />
      <div className="byupdate-banner">
    <h1>Update Order</h1>
  </div>
      <div className="byupdate-page">
        
        <form className="byupdate-form" onSubmit={handleSubmit}>
          <label>Buyer NIC:</label>
          <input
            type="text"
            name="buyerId"
            value={inputs.buyerId}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "");
              if (value.length <= 12) {
                setInputs((prev) => ({ ...prev, buyerId: value }));
              }
            }}
            readOnly
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
            value={inputs.quantity || 0}
            onChange={handleChange}
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
          <input type="date" name="orderdate" value={inputs.orderdate} onChange={handleChange} />

          <div className="byupdate-buttons">
            <button type="button" onClick={() => navigate(-1)}>Back</button>
            <button type="submit">Update Order</button>
          </div>
        </form>
      </div>
      <Bfooter />
    </div>
  );
}

export default Borderconfirmupdate;