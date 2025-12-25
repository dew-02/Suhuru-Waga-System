import React, { useEffect, useState } from "react";
import axios from "axios";
import Bfooter from "../Bfooter/Bfooter";
import Bheader from "../Bheader/Bheader";
import "./Bfarmerdashboard.css";

const ORDER_URL = "http://localhost:5000/confirmb";
const PAYMENT_URL = "http://localhost:5000/api/payments";

function FarmerDashboard() {
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    fetchOrders();
    fetchPayments();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get(ORDER_URL);
      setOrders(res.data.orders || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await axios.get(PAYMENT_URL);
      setPayments(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatus = async (orderId, status) => {
    try {
      await axios.put(`${ORDER_URL}/${orderId}`, { status });
      fetchOrders();
      alert(`Order ${status}`);
    } catch (err) {
      console.error(err);
      alert("Failed to update order status");
    }
  };

  const verifyPayment = async (orderId) => {
    try {
      const order = orders.find(o => o._id === orderId);
      const payment = payments.find(p => p.payment_id === order?.buyerId);

      if (!payment) {
        alert("No payment found for this order!");
        return;
      }

      // ✅ Call the verify route, not updateOrders
    const res = await axios.put(`${ORDER_URL}/${orderId}/verify`);

      const updatedOrder = res.data.order;
      setOrders(prevOrders =>
        prevOrders.map(o => o._id === orderId ? updatedOrder : o)
      );

      alert("Payment verified successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to verify payment. Try again.");
    }
  };

  return (
    <div className="byfarmer-dashboard">
      <Bheader />
      <div className="byfdashboard-container">
        <h2>Farmer Dashboard - Orders</h2>
        <table className="byforders-table">
          <thead>
            <tr>
              <th>Buyer NIC</th>
              <th>Crop</th>
              <th>Quantity</th>
              <th>Total Price</th>
              <th>Status</th>
              <th>Paid</th>
              <th>Receipt</th>
              <th>Order PDF</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => {
              const payment = payments.find(p => p.payment_id === order.buyerId);
              return (
                <tr key={order._id}>
                  <td>{order.buyerId}</td>
                  <td>{order.cropId}</td>
                  <td>{order.quantity} {order.unit}</td>
                  <td>{order.totalPrice}</td>
                  <td>{order.status}</td>
                  <td>{order.isPaid ? "Yes" : "No"}</td>
                  <td>
                    {payment?.bank_receipt ? (
                      <a
                        href={`http://localhost:5000/${payment.bank_receipt}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "green" }}
                      >
                        View Receipt
                      </a>
                    ) : (
                      "N/A"
                    )}
                  </td>
                  <td>
                    {payment?.order_pdf ? (
                      <a
                        href={`http://localhost:5000/${payment.order_pdf}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "blue" }}
                      >
                        View Order
                      </a>
                    ) : (
                      "N/A"
                    )}
                  </td>
                  <td>
                    {order.status === "pending" && (
                      <>
                    
                        <button className="byfbutton" onClick={() => handleStatus(order._id, "accepted")}>Accept</button>
                        <button  className="byfbutton" onClick={() => handleStatus(order._id, "rejected")}>Reject</button>
                      </>
                    )}
                    {order.status === "accepted" && !order.isPaid && (
                      <button className="byfbutton" onClick={() => verifyPayment(order._id)}>Verify Payment</button>
                    )}
                    {order.status === "accepted" && order.isPaid && <span>Paid</span>}
                    {order.status === "rejected" && <span>Rejected</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Bfooter />
    </div>
  );
}

export default FarmerDashboard;