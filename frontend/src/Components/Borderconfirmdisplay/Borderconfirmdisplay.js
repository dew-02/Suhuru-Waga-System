import React, { useState, useEffect } from 'react';
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Bfooter from "../Bfooter/Bfooter";
import Bheader from '../Bheader/Bheader';
import "./Borderconfirmdisplay.css"; 

//  UPDATED IMPORTS (added proper autoTable import)
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; //  correct plugin import

const URL = "http://localhost:5000/confirmb";

function Borderconfirmdisplay() {
  const [orders, setOrders] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get(URL);
      setOrders(res.data.orders || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Delete handler with payment check
  const deleteHandler = async (order) => {
    if (order.isPaid) {
      alert("Cannot delete this order. Payment is already verified.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this order?")) return;

    try {
      await axios.delete(`${URL}/${order._id}`);
      setOrders(orders.filter(o => o._id !== order._id));
      alert("Order deleted successfully!");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to delete order.");
    }
  };

  const downloadPDF = (order) => {
    const doc = new jsPDF("p", "mm", "a4");
    let y = 15;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Order Details`, 14, y);
    y += 10;

    const details = [
      ["Buyer NIC:", order.buyerId || "N/A"],
      ["Farmer NIC:", order.farmerId || "N/A"],
      ["Crop Name:", order.cropId || "N/A"],
      ["Price Per 1kg:", order.pricePerKg || "N/A"],
      ["Quantity:", order.quantity || "N/A"],
      ["Unit:", order.unit || "N/A"],
      ["Total Price:", order.totalPrice || "N/A"],
      ["Payment Method:", order.paymentMethod || "N/A"],
      ["Delivery Address:", order.deliveryaddress || "N/A"],
      ["Order Date:", order.orderdate ? new Date(order.orderdate).toLocaleDateString() : "N/A"],
      ["Status:", order.status || "pending"],
      ["Paid:", order.isPaid ? "Yes" : "No"]
    ];

    details.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(label, 14, y);
      doc.setFont("helvetica", "normal");
      doc.text(String(value), 55, y);
      y += 6;
    });

    doc.save(`order_${order._id}.pdf`);
  };

  const contactFarmer = (order) => {
    if (!order.isPaid) {
      alert("Payment must be verified before contacting the farmer.");
      return;
    }
    window.open(`https://wa.me/${order.farmerId}`, "_blank");
  };

  // NEW FUNCTION — Download full table report of all orders
  const downloadAllOrdersReport = () => {
    if (orders.length === 0) {
      alert("No orders to generate report.");
      return;
    }

    const doc = new jsPDF("landscape", "mm", "a4");
    doc.setFontSize(16);
    doc.text("All Orders Report", 14, 15);

    //  Include date and total count
    doc.setFontSize(10);
    const currentDate = new Date().toLocaleDateString();
    doc.text(`Generated on: ${currentDate}`, 14, 22);
    doc.text(`Total Orders: ${orders.length}`, 250, 22, { align: "right" });

    const tableColumn = [
      "Buyer NIC",
      "Farmer PhoneNumber",
      "Crop Name",
      "Price/Kg (Rs)",
      "Qty",
      "Unit",
      "Total Price (Rs)",
      "Payment",
      "Delivery Address",
      "Order Date",
      "Status",
      "Paid"
    ];

    const tableRows = orders.map((order) => [
      order.buyerId || "N/A",
      order.farmerId || "N/A",
      order.cropId || "N/A",
      order.pricePerKg || "N/A",
      order.quantity || "N/A",
      order.unit || "N/A",
      order.totalPrice || "N/A",
      order.paymentMethod || "N/A",
      order.deliveryaddress || "N/A",
      order.orderdate ? new Date(order.orderdate).toLocaleDateString() : "N/A",
      order.status || "pending",
      order.isPaid ? "Yes" : "No"
    ]);

    //  UPDATED CALL (use autoTable function instead of doc.autoTable)
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save("All_Orders_Report.pdf");
  };

  return (
    <div>
      <Bheader />

      <div className="order-display-page">
        <div className="order-banner">Order Details Display</div>

        {orders.length === 0 ? (
          <p className="no-orders">No orders found.</p>
        ) : (
          <>
            {/* Instructions Section */}
            <div className="instruction-section">
              <h2 className="instruction-title">Instructions for Buyers</h2>
              <ul className="instruction-list">
                <li>Review each order carefully before confirming or deleting.</li>
                <li>Use the <strong>“Edit”</strong> button to update your order details if needed (only available while the order is <em>Pending</em>).</li>
                <li>
                  <strong>Important:</strong> After the farmer has <strong>accepted</strong> the order, you will <strong>no longer be able to edit or delete</strong> the order details.
                </li>
                <li>
                  After the farmer accepts the order you <strong>must download the Order Details PDF</strong>. The downloaded PDF is required for payment.
                </li>
                <li>Make your payment only after the order status shows <strong>“Accepted”</strong>.</li>
                <li>
                  To make payment you must <strong>upload that downloaded Order Details PDF</strong> in the payment section. Payment will only be processed once the correct PDF is uploaded and verified.
                </li>
                <li>You can download a PDF copy of your order for your personal record.</li>
                <li>Once payment is verified, use the <strong>“Contact Farmer”</strong> button to coordinate delivery.</li>
              </ul>
            </div>

            {/* Cards Section */}
            <div className="order-cards-container">
              {orders.map((order, i) => (
                <div key={i} className="order-card">
                  <div className="order-card-header">
                    {order.cropId || "Unknown Crop"}
                  </div>

                  <div className="order-details">
                    <p><strong>Buyer NIC:</strong> {order.buyerId}</p>
                    <p><strong>Farmer Phone:</strong> {order.farmerId}</p>
                    <p><strong>Price Per 1kg:</strong> Rs. {order.pricePerKg}</p>
                    <p><strong>Quantity:</strong> {order.quantity} {order.unit}</p>
                    <p><strong>Total Price:</strong> Rs. {order.totalPrice}</p>
                    <p><strong>Payment Method:</strong> {order.paymentMethod}</p>
                    <p><strong>Delivery Address:</strong> {order.deliveryaddress}</p>
                    <p><strong>Order Date:</strong> {order.orderdate ? new Date(order.orderdate).toLocaleDateString() : "N/A"}</p>
                    <p><strong>Status:</strong> {order.status || "pending"}</p>
                    <p><strong>Paid:</strong> {order.isPaid ? "Yes" : "No"}</p>
                  </div>

                  <div className="action-buttons">
                    <button className="update-btn" onClick={() => navigate(`/confirmorder/${order._id}`)}>Edit</button>
                    <button className="delete-btn" onClick={() => deleteHandler(order)}>Delete</button>
                    <button className="download-btn" onClick={() => downloadPDF(order)}>Download</button>

                    {order.status === "accepted" && !order.isPaid && (
                      <button
                        className="pay-btn"
                        onClick={() => navigate(`/bpay`, { state: { order } })}
                      >
                        Pay Now
                      </button>
                    )}

                    {order.isPaid && (
                      <button
                        className="contact-btn"
                        onClick={() => contactFarmer(order)}
                      >
                        Contact Farmer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* NEW BUTTON — Full Report */}
            <div className="download-all-container">
              <button className="download-all-btn" onClick={downloadAllOrdersReport}>
                Download All Orders Report
              </button>
            </div>
          </>
        )}
      </div>

      <Bfooter />
    </div>
  );
}

export default Borderconfirmdisplay;