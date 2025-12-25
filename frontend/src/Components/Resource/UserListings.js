import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "./UserListing.css"; // keep your existing styles

// NOTE: This is a drop-in replacement/enhancement for your existing UserResources component.
// It fetches the same data, renders your tables, adds charts (Recharts) and allows a PDF download
// containing both tables and charts by snapshotting the report DOM area.

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f50", "#a4de6c", "#d0ed57"];

const UserResourcesWithReports = ({ userId }) => {
  const [resources, setResources] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredResources, setHoveredResources] = useState(() => {
    const stored = localStorage.getItem("hoveredResources");
    return stored ? JSON.parse(stored) : {};
  });

  const reportRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!userId) throw new Error("No user ID provided");

        const resResources = await fetch(
          `http://localhost:5000/resources/user/${userId}`
        );
        if (!resResources.ok) throw new Error("Failed to fetch resources");
        const resourceData = await resResources.json();

        const sortedResources = resourceData
          .sort(
            (a, b) =>
              new Date(b.metadata?.createdAt) - new Date(a.metadata?.createdAt)
          )
          .map((r) => ({ ...r, isNew: !hoveredResources[r._id] }));

        setResources(sortedResources);

        const resBookings = await fetch(`http://localhost:5000/bookings`);
        if (!resBookings.ok) throw new Error("Failed to fetch bookings");
        const bookingData = await resBookings.json();

        const myResourceIds = sortedResources.map((r) => r._id);
        const myBookings = bookingData
          .filter((b) => myResourceIds.includes(b.resourceId))
          .map((b) => {
            const resource = sortedResources.find((r) => r._id === b.resourceId);
            return { ...b, resourceName: resource?.name || b.resourceId };
          });

        setBookings(myBookings);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, hoveredResources]);

  const handleRowHover = (resourceId) => {
    if (!hoveredResources[resourceId]) {
      const updated = { ...hoveredResources, [resourceId]: true };
      setHoveredResources(updated);
      localStorage.setItem("hoveredResources", JSON.stringify(updated));
      setResources((prev) =>
        prev.map((r) => (r._id === resourceId ? { ...r, isNew: false } : r))
      );
    }
  };

  const handleUpdateBookingStatus = async (bookingId, newStatus) => {
    try {
      const res = await fetch(
        `http://localhost:5000/bookings/${bookingId}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (!res.ok) throw new Error("Failed to update booking status");

      setBookings((prev) =>
        prev.map((b) =>
          b._id === bookingId
            ? { ...b, status: newStatus, hideActions: true }
            : b
        )
      );
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const handleDeleteResource = async (resourceId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this resource and all its bookings?"
      )
    )
      return;

    try {
      const res = await fetch(`http://localhost:5000/resources/${resourceId}/full`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete resource and bookings");

      setResources((prev) => prev.filter((r) => r._id !== resourceId));
      setBookings((prev) => prev.filter((b) => b.resourceId !== resourceId));
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  // ----- Chart data transformations -----
  const resourcesByCategory = useMemo(() => {
    const map = {};
    resources.forEach((r) => {
      const cat = r.category || "Unspecified";
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [resources]);

  const lowStockCount = useMemo(() => {
    return resources.reduce((acc, r) => acc + (r.shortageFlags?.isLowStock ? 1 : 0), 0);
  }, [resources]);

  const bookingsByStatus = useMemo(() => {
    const map = {};
    bookings.forEach((b) => {
      const s = b.status || "Pending";
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [bookings]);

  const bookingsByResource = useMemo(() => {
    const map = {};
    bookings.forEach((b) => {
      const name = b.resourceName || b.resourceId;
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [bookings]);

  // ----- PDF generation -----
  const downloadPDF = async () => {
    if (!reportRef.current) return;
    try {
      const element = reportRef.current;
      // Increase scale for better resolution
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // fit image to page width, keep aspect
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pageWidth - 40; // margin
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      let remainingHeight = imgHeight;
      let position = 20;
      // if image fits on one page
      pdf.addImage(imgData, "PNG", 20, position, imgWidth, imgHeight);

      // If image is longer than page, add extra pages (simple approach)
      if (imgHeight > pageHeight - 40) {
        const totalPages = Math.ceil(imgHeight / (pageHeight - 40));
        for (let i = 1; i < totalPages; i++) {
          pdf.addPage();
          // draw same image but shifted up by pageHeight*(i)
          const y = -i * (pageHeight - 40) + 20;
          pdf.addImage(imgData, "PNG", 20, y, imgWidth, imgHeight);
        }
      }

      pdf.save(`resources_report_${new Date().toISOString()}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. See console for details.");
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="user-resources-error">{error}</p>;

  return (
    <div className="user-resources-wrapper">
      <header className="user-resources-header">
        <h1 className="user-resources-title">📦 My Resources & Reports</h1>
        <p className="user-resources-subtitle">View and manage resources you have added — and produce a downloadable PDF report that includes charts and tables.</p>
        <div style={{ marginTop: "0.75rem" }}>
          <button className="user-resources-action-btn" onClick={downloadPDF}>
            ⤓ Download PDF Report
          </button>
        </div>
      </header>

      <main ref={reportRef} id="report-content">
        <section style={{ marginTop: "1.5rem" }}>
          <h2>Resources</h2>
          <div className="user-resources-table-container">
            <table className="user-resources-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Total Units</th>
                  <th>Available Units</th>
                  <th>Base Rate</th>
                  <th>Max Price Ceiling</th>
                  <th>Low Stock?</th>
                  <th>Created At</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((res) => (
                  <tr
                    key={res._id}
                    className={`${
                      res.shortageFlags?.isLowStock
                        ? "user-resources-low"
                        : "user-resources-ok"
                    } ${res.isNew ? "user-resources-new" : ""}`}
                    onMouseEnter={() => handleRowHover(res._id)}
                  >
                    <td>{res._id}</td>
                    <td>{res.name}</td>
                    <td>{res.category}</td>
                    <td className="user-resources-center">{res.availability?.totalUnits ?? "-"}</td>
                    <td className="user-resources-center">{res.availability?.availableUnits ?? "-"}</td>
                    <td className="user-resources-center">Rs. {res.pricing?.baseRate ?? "-"}</td>
                    <td className="user-resources-center">Rs. {res.pricing?.maxPriceCeiling ?? "-"}</td>
                    <td>{res.shortageFlags?.isLowStock ? "Yes" : "No"}</td>
                    <td>{res.metadata?.createdAt ? new Date(res.metadata.createdAt).toLocaleString() : "-"}</td>
                    <td>{res.metadata?.lastUpdated ? new Date(res.metadata.lastUpdated).toLocaleString() : "-"}</td>
                    <td>
                      <button className="user-resources-delete-btn" onClick={() => handleDeleteResource(res._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Bookings Table */}
        <section style={{ marginTop: "1.5rem" }}>
          <h2>Booking Requests</h2>
          {bookings.length === 0 ? (
            <p>No booking requests yet.</p>
          ) : (
            <div className="user-resources-table-container">
              <table className="user-resources-table">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Resource</th>
                    <th>Farmer Name</th>
                    <th>Contact</th>
                    <th>Email</th>
                    <th>Date</th>
                    <th>Duration (hrs)</th>
                    <th>Partial Payment</th>
                    <th>Status</th>
                    <th>Receipt File</th> {/* <-- New Column */}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b._id}>
                      <td>{b._id}</td>
                      <td>{b.resourceName}</td>
                      <td>{b.farmerName}</td>
                      <td>{b.farmerContact}</td>
                      <td>{b.farmerEmail}</td>
                      <td>{new Date(b.date).toLocaleString()}</td>
                      <td>{b.durationHours}</td>
                      <td>{b.partialPayment ? "Yes" : "No"}</td>
                      <td>{b.status ?? "Pending"}</td>
                      <td>
                        {b.receiptFileName ? (
                          <a
                            href={`http://localhost:5000/uploads/${b.receiptFileName}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#2563eb", textDecoration: "underline" }}
                          >
                            {b.receiptFileName}
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        {b.status === "Confirmed" || b.status === "Rejected" ? (
                          <span>{b.status}</span>
                        ) : (
                          <>
                            <button
                              className="user-resources-confirm-btn"
                              onClick={() => handleUpdateBookingStatus(b._id, "Confirmed")}
                            >
                              Confirm
                            </button>
                            <button
                              className="user-resources-reject-btn"
                              onClick={() => handleUpdateBookingStatus(b._id, "Rejected")}
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </main>

      {/* small styles specific to the report; you can move these to your CSS file */}
      <style>{`
        .kpi-card { background: #fff; padding: 12px 18px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); min-width: 140px; }
        .kpi-value { font-size: 20px; font-weight: 700; }
        .kpi-label { font-size: 12px; color: #555; }
        .charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; }
        .chart-card { background: #fff; padding: 10px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
        .user-resources-action-btn { background: #2563eb; color: white; padding: 8px 12px; border: none; border-radius: 6px; cursor: pointer; }
        .user-resources-action-btn:hover { opacity: 0.9 }
      `}</style>
    </div>
  );
};

export default UserResourcesWithReports;
