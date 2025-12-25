import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Bfooter from "../Bfooter/Bfooter";
import Bheader from "../Bheader/Bheader";
import "./Bpaymentdispaly.css";

function Bpaymentdisplay() {
  const [payments, setPayments] = useState([]);
  const navigate = useNavigate();

  const fetchPayments = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/payments");
      setPayments(res.data);
    } catch (err) {
      console.error("Failed to fetch payments", err);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  // Navigate to cancel order form
  const handleCancel = (payment) => {
    navigate(`/bcancelorder`, {
      state: {
        cancel_id: payment.payment_id, // buyer NIC
        order_id: payment.company_name, // change to actual order ID if needed
      },
    });
  };

  return (
    <div className="bypayment-dashboard">
      <Bheader />

      <div className="byfpayment-container">
        <h1 className="byfpayment-title">All Payments</h1>

        {/* 🧾 Payment Page Instructions */}
        <div className="payment-instructions">
          <h2 className="instruction-title">Payment Instructions</h2>
          <ul className="instruction-list">
            <li>
              Once your order is <strong>accepted by the farmer</strong>, you can
              proceed with the payment process.
            </li>
            <li>
              <strong>Important:</strong> You <strong>cannot edit or delete</strong>{" "}
              any payment details after submission. This restriction is part of our
              site’s security and regulation policy.
            </li>
            <li>
              Please make sure to <strong>upload the correct Order Details PDF</strong>{" "}
              that you downloaded after the farmer accepted your order. Payments
              without a valid PDF will not be processed.
            </li>
            <li>
              After completing your payment, you can <strong>view your uploaded PDF</strong>{" "}
              and <strong>bank receipt</strong> at any time for reference.
            </li>
            <li>
              If you wish to <strong>cancel your order after payment</strong>, click the{" "}
              <strong>“Cancel”</strong> button and fill out the cancellation form with
              accurate details.
            </li>
            <li>
              After submitting the cancellation form, you <strong>must call and inform
              the farmer directly</strong> to ensure proper communication and confirmation.
            </li>
            <li>
              Refunds or cancellations will be handled according to our{" "}
              <strong>site’s policies and farmer agreement.</strong>
            </li>
          </ul>
        </div>

        {/* Existing table display (unchanged) */}
        {payments.length === 0 ? (
          <p>No payments yet.</p>
        ) : (
          <table className="byfpayment-table">
            <thead>
              <tr>
                <th>Buyer NIC</th>
                <th>Company Name</th>
                <th>Amount (LKR)</th>
                <th>Method</th>
                <th>Bank Receipt</th>
                <th>Order PDF</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment._id}>
                  <td data-label="Buyer NIC">{payment.payment_id || "not yet"}</td>
                  <td data-label="Company Name">{payment.company_name || "not yet"}</td>
                  <td data-label="Amount (LKR)">{payment.amount || "not yet"}</td>
                  <td data-label="Method">{payment.payment_method || "not yet"}</td>
                  <td data-label="Bank Receipt">
                    {payment.bank_receipt ? (
                      <a
                        href={`http://localhost:5000/${payment.bank_receipt}`}
                        target="_blank"
                        rel="noreferrer"
                        className="byfpayment-btn view-receipt"
                      >
                        View Receipt
                      </a>
                    ) : (
                      <span className="byfpayment-btn">N/A</span>
                    )}
                  </td>
                  <td data-label="Order PDF">
                    {payment.order_pdf ? (
                      <a
                        href={`http://localhost:5000/${payment.order_pdf}`}
                        target="_blank"
                        rel="noreferrer"
                        className="byfpayment-btn view-order"
                      >
                        View Order
                      </a>
                    ) : (
                      <span className="byfpayment-btn">N/A</span>
                    )}
                  </td>
                  <td data-label="Actions">
                    <button
                      type="button"
                      onClick={() => handleCancel(payment)}
                      className="byfpayment-btn cancel"
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Bfooter />
    </div>
  );
}

export default Bpaymentdisplay;