// DemandReportWithPDF.jsx
import React, { useEffect, useRef, useState } from "react";
import { Line, Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./DemandReport.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

/* -------------------------
   Color Theme A (Soft + Clean)
   Titles: rgb(34, 102, 34) (forest green)
   Subheadings: rgb(120, 72, 0) (earth brown)
   Shortages: rgb(200, 0, 0)
   Sufficiency: rgb(0, 140, 50)
   Lines: rgb(160, 160, 160)
   ------------------------- */

const COLORS = {
  title: [34, 102, 34],
  subheading: [120, 72, 0],
  shortage: [200, 0, 0],
  sufficient: [0, 140, 50],
  line: [160, 160, 160],
  accentBg: "#eef9ef",
};

const chartTypes = ["lineChartData", "pieChartData", "barChartData"];
const chartTitles = {
  lineChartData: "Bookings Per Month",
  pieChartData: "Revenue Per Season",
  barChartData: "Total Unit Hours",
};

const DemandReport = () => {
  const [reportData, setReportData] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCharts, setExpandedCharts] = useState({});
  const [chartData, setChartData] = useState({});
  const [activeChartType, setActiveChartType] = useState({});

  // Refs for hidden charts used for PDF generation
  const pdfChartContainerRef = useRef(null);
  const lineChartRef = useRef(null);
  const pieChartRef = useRef(null);
  const barChartRef = useRef(null);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const resourcesRes = await fetch("http://localhost:5000/resources", { mode: "cors" });
        const bookingsRes = await fetch("http://localhost:5000/bookings", { mode: "cors" });

        if (!resourcesRes.ok || !bookingsRes.ok) throw new Error("Failed to fetch data");

        const resources = await resourcesRes.json();
        const bookingsJson = await bookingsRes.json();

        setBookings(bookingsJson);

        const month = new Date().getMonth() + 1;
        const seasonNow = month >= 3 && month <= 8 ? "Yala" : "Maha";

        const report = resources.map((resource) => {
          const demandCount = bookingsJson.filter(
            (b) => b.resourceId === resource._id && ["Pending", "Confirmed"].includes(b.status)
          ).length;

          const available = resource.availability?.availableUnits || 0;
          const shortage = Math.max(demandCount - available, 0);

          return {
            resourceId: resource._id,
            resource: resource.name,
            type: resource.category || "Uncategorized",
            available,
            demand: demandCount,
            shortage,
            season: seasonNow,
            price: Number(resource.price ?? resource.unitPrice ?? 0),
            status: shortage > 0 ? "Shortage" : "Sufficient",
          };
        });

        setReportData(report);
      } catch (err) {
        console.error("Could not fetch report data:", err);
        setError("Failed to load report data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, []);

  const fetchChartData = async (resourceId) => {
    if (chartData[resourceId]) {
      setExpandedCharts((prev) => ({ ...prev, [resourceId]: !prev[resourceId] }));
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/bookings/history/${resourceId}`, { mode: "cors" });
      if (!res.ok) throw new Error("Failed to fetch chart data");

      const data = await res.json();
      setChartData((prev) => ({ ...prev, [resourceId]: data }));
      setExpandedCharts((prev) => ({ ...prev, [resourceId]: true }));
      setActiveChartType((prev) => ({ ...prev, [resourceId]: chartTypes[0] }));
    } catch (err) {
      console.error("Error fetching chart data:", err);
      alert("Failed to fetch chart data for this resource.");
    }
  };

  const handleChartSwitch = (resourceId, direction) => {
    const currentType = activeChartType[resourceId] || chartTypes[0];
    const currentIndex = chartTypes.indexOf(currentType);
    const nextIndex = (currentIndex + direction + chartTypes.length) % chartTypes.length;
    setActiveChartType((prev) => ({ ...prev, [resourceId]: chartTypes[nextIndex] }));
  };

  /* ---------------- Aggregate data builders for PDF charts ---------------- */

  const buildBookingsPerMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const counts = months.map((m) =>
      bookings.filter((b) => {
        const d = new Date(b.date || b.createdAt || b.bookingDate || b.startDate || b.requestedDate);
        return d.getFullYear() === year && d.getMonth() + 1 === m && ["Pending", "Confirmed"].includes(b.status);
      }).length
    );

    return {
      labels: months.map((m) => `${m}`),
      datasets: [
        {
          label: "Bookings",
          data: counts,
          fill: false,
          tension: 0.2,
          borderColor: "rgb(34,102,34)",
          backgroundColor: "rgba(34,102,34,0.1)",
        },
      ],
    };
  };

  const buildRevenuePerSeason = () => {
    const seasons = ["Yala", "Maha"];
    const revenue = seasons.map((s) =>
      reportData
        .filter((r) => r.season === s)
        .reduce((acc, r) => acc + (r.demand || 0) * (r.price || 0), 0)
    );

    return {
      labels: seasons,
      datasets: [
        {
          label: "Estimated Revenue",
          data: revenue,
          backgroundColor: ["rgba(34,102,34,0.7)", "rgba(120,72,0,0.7)"],
        },
      ],
    };
  };

  const buildTotalUnitHours = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const daysCount = new Date(year, month, 0).getDate();
    const days = Array.from({ length: daysCount }, (_, i) => i + 1);
    const hoursPerDay = days.map((d) => {
      const count = bookings.reduce((acc, b) => {
        const dateStr = b.date || b.startDate || b.bookingDate || b.createdAt || b.requestedDate;
        if (!dateStr) return acc;
        const dt = new Date(dateStr);
        if (dt.getFullYear() !== year || dt.getMonth() + 1 !== month) return acc;
        const day = dt.getDate();
        if (day !== d) return acc;
        const hrs = b.durationHours ?? b.hours ?? b.usageHours ?? 1;
        return acc + Number(hrs || 1);
      }, 0);
      return count;
    });

    return {
      labels: days.map(String),
      datasets: [
        {
          label: "Unit Hours",
          data: hoursPerDay,
          backgroundColor: "rgba(34,102,34,0.6)",
        },
      ],
    };
  };

  /* ---------------- Utility aggregations for PDF content ---------------- */

  const getTotals = () => {
    const totalResources = reportData.length;
    const totalDemand = reportData.reduce((s, r) => s + (r.demand || 0), 0);
    const totalShortage = reportData.reduce((s, r) => s + (r.shortage || 0), 0);
    const totalRevenue = reportData.reduce((s, r) => s + (r.demand || 0) * (r.price || 0), 0);
    const shortageCount = reportData.filter((r) => r.shortage > 0).length;
    return { totalResources, totalDemand, totalShortage, totalRevenue, shortageCount };
  };

  const categoryBreakdown = () => {
    const map = {};
    reportData.forEach((r) => {
      map[r.type] = map[r.type] || { demand: 0, available: 0, count: 0, revenue: 0 };
      map[r.type].demand += r.demand || 0;
      map[r.type].available += r.available || 0;
      map[r.type].count += 1;
      map[r.type].revenue += (r.demand || 0) * (r.price || 0);
    });
    return map;
  };

  const seasonalShortagePct = () => {
    const seasonGroups = reportData.reduce((acc, r) => {
      acc[r.season] = acc[r.season] || { demand: 0, shortage: 0 };
      acc[r.season].demand += r.demand || 0;
      acc[r.season].shortage += r.shortage || 0;
      return acc;
    }, {});
    const result = {};
    Object.entries(seasonGroups).forEach(([s, st]) => {
      result[s] = st.demand === 0 ? 0 : Math.round((st.shortage / st.demand) * 100);
    });
    return result;
  };

  /* ----------------- PDF generation --------------------- */

  const generatePDF = async () => {
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      const usableWidth = pageWidth - margin * 2;

      const totals = getTotals();
      const categories = categoryBreakdown();
      const seasonalPct = seasonalShortagePct();

      /* ---------- Page 1: Cover ---------- */
      doc.setFillColor(...COLORS.title);
      // Title in green
      doc.setFontSize(24);
      doc.setTextColor(...COLORS.title);
      doc.text("Agricultural Resource Demand Report", margin, 80);

      // Subtitle in brown
      doc.setFontSize(12);
      doc.setTextColor(...COLORS.subheading);
      doc.text("Aggregate overview — generated by Suhuru Waga System pvt. ltd.", margin, 105);

      // Horizontal separator
      doc.setDrawColor(...COLORS.line);
      doc.setLineWidth(0.5);
      doc.line(margin, 120, pageWidth - margin, 120);

      // Key metrics block with light green background box
      const blockTop = 140;
      const blockHeight = 110;
      doc.setFillColor(COLORS.accentBg);
      doc.rect(margin, blockTop - 10, usableWidth, blockHeight, "F");

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin + 8, blockTop + 6);

      // Metrics
      doc.setFontSize(13);
      doc.setTextColor(...COLORS.title);
      doc.text(`Total resources: ${totals.totalResources}`, margin + 8, blockTop + 30);
      doc.text(`Total bookings (demand): ${totals.totalDemand}`, margin + 8, blockTop + 50);

      // Revenue
      doc.setTextColor(34, 102, 34);
      doc.text(`Estimated total revenue: ${totals.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, margin + 8, blockTop + 70);

      // Shortage summary (red)
      doc.setTextColor(...COLORS.shortage);
      doc.text(`Total shortage units: ${totals.totalShortage}`, margin + usableWidth / 2, blockTop + 30);
      doc.text(`Resources in shortage: ${totals.shortageCount}`, margin + usableWidth / 2, blockTop + 50);

      // Peak demand resource
      const peak = [...reportData].sort((a, b) => b.demand - a.demand)[0];
      if (peak) {
        doc.setTextColor(...COLORS.subheading);
        doc.setFontSize(12);
        doc.text(`Peak demand resource: ${peak.resource} (Demand: ${peak.demand})`, margin, blockTop + blockHeight + 20);
      }

      // Footer small note
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("Note: revenue = demand × unit price (estimated).", margin, pageHeight - margin + 5);

      doc.addPage();

      /* ---------- Page 2: Summary details ---------- */
      doc.setFontSize(18);
      doc.setTextColor(...COLORS.title);
      doc.text("Summary & Breakdown", margin, 60);

      doc.setDrawColor(...COLORS.line);
      doc.setLineWidth(0.5);
      doc.line(margin, 70, pageWidth - margin, 70);

      let y = 95;
      doc.setFontSize(12);
      doc.setTextColor(...COLORS.subheading);
      doc.text("By Category / Type", margin, y);
      y += 18;

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);

      const catEntries = Object.entries(categories);
      if (catEntries.length === 0) {
        doc.text("No category data available.", margin, y);
        y += 18;
      } else {
        // print up to 6 categories, then continue on next page if needed
        for (let i = 0; i < catEntries.length; i++) {
          const [type, vals] = catEntries[i];
          const revStr = vals.revenue ? vals.revenue.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0";
          doc.text(`${type} — Resources: ${vals.count}, Demand: ${vals.demand}, Available: ${vals.available}, Est. Revenue: ${revStr}`, margin, y);
          y += 16;
          if (y > pageHeight - margin - 80) {
            doc.addPage();
            y = 80;
          }
        }
      }

      // Add small separation
      y += 8;
      doc.setDrawColor(...COLORS.line);
      doc.line(margin, y, pageWidth - margin, y);
      y += 16;

      // Demand vs Available mini-list (top 8)
      doc.setFontSize(13);
      doc.setTextColor(...COLORS.subheading);
      doc.text("Top Resources (by demand & shortage)", margin, y);
      y += 18;
      doc.setFontSize(11);
      const sortedByDemand = [...reportData].sort((a, b) => b.demand - a.demand).slice(0, 8);
      sortedByDemand.forEach((r) => {
        const color = r.shortage > 0 ? COLORS.shortage : COLORS.sufficient;
        doc.setTextColor(...color);
        doc.text(`${r.resource} — Demand: ${r.demand}, Available: ${r.available}, Shortage: ${r.shortage}`, margin, y);
        y += 15;
        if (y > pageHeight - margin - 60) {
          doc.addPage();
          y = 80;
        }
      });

      doc.setTextColor(0, 0, 0);
      y += 10;

      // Seasonal shortage %
      doc.setFontSize(13);
      doc.setTextColor(...COLORS.subheading);
      doc.text("Seasonal Shortage %", margin, y);
      y += 18;
      doc.setFontSize(11);
      const seasons = Object.entries(seasonalPct);
      const seasonObj = seasonalPct;
      Object.keys(seasonObj).forEach((s) => {
        const pct = seasonObj[s];
        doc.setTextColor(...COLORS.title);
        doc.text(`${s}: ${pct}% of demand in shortage.`, margin, y);
        y += 14;
      });

      // Add page for charts
      doc.addPage();

      /* ---------- Page 3+: Charts (capture hidden container) ---------- */
      doc.setFontSize(16);
      doc.setTextColor(...COLORS.title);
      doc.text("Aggregate Charts", margin, 60);
      doc.setDrawColor(...COLORS.line);
      doc.line(margin, 70, pageWidth - margin, 70);

      // wait for charts to render
      await new Promise((res) => setTimeout(res, 800));

      if (pdfChartContainerRef.current) {
        const canvas = await html2canvas(pdfChartContainerRef.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/png");
        const imgProps = doc.getImageProperties(imgData);
        const imgWidth = usableWidth;
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

        // If image height fits page, draw; otherwise slice into multiple pages
        const pageInnerHeight = pageHeight - margin * 2 - 40; // leave room for header/footer
        if (imgHeight <= pageInnerHeight) {
          const yOffset = 90;
          doc.addImage(imgData, "PNG", margin, yOffset, imgWidth, imgHeight);
        } else {
          // slice the canvas image
          const sliceCanvas = document.createElement("canvas");
          const sliceCtx = sliceCanvas.getContext("2d");
          const scale = canvas.width / imgWidth;
          let remainingHeight = imgHeight;
          let offsetYpdf = 0;

          while (remainingHeight > 0) {
            const drawHeight = Math.min(pageInnerHeight, remainingHeight);
            const sourceY = Math.round(offsetYpdf * scale);
            const sourceH = Math.round(drawHeight * scale);

            sliceCanvas.width = canvas.width;
            sliceCanvas.height = sourceH;
            sliceCtx.clearRect(0, 0, sliceCanvas.width, sliceCanvas.height);
            sliceCtx.drawImage(canvas, 0, sourceY, canvas.width, sourceH, 0, 0, canvas.width, sourceH);

            const sliceData = sliceCanvas.toDataURL("image/png");
            const props = doc.getImageProperties(sliceData);
            const drawHOnPdf = (props.height * imgWidth) / props.width;

            // header for each chart page
            doc.addImage(sliceData, "PNG", margin, 90, imgWidth, drawHOnPdf);

            remainingHeight -= drawHOnPdf;
            offsetYpdf += drawHOnPdf;
            if (remainingHeight > 0) doc.addPage();
          }
        }
      } else {
        // fallback note
        doc.setFontSize(12);
        doc.setTextColor(150, 0, 0);
        doc.text("Charts not available — rendering failed.", margin, 100);
      }

      // Ensure minimum 3 pages
      const totalPages = doc.getNumberOfPages();
      if (totalPages < 3) {
        for (let i = totalPages; i < 3; i++) doc.addPage();
      }

      // Add small watermark footer on final page
      doc.setPage(doc.getNumberOfPages());
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text("Generated by Wave Wards — Agricultural insights", margin, pageHeight - 30);

      // Download
      doc.save("Agricultural_Resource_Demand_Report.pdf");
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("Failed to generate PDF. Check console for details.");
    }
  };

  /* ----------------- Hidden aggregate chart data ----------------- */
  const lineData = buildBookingsPerMonth();
  const pieData = buildRevenuePerSeason();
  const barData = buildTotalUnitHours();

  /* ----------------- Render ----------------- */
  return (
    <div className="page-container">
      <div className="report-wrapper">
        <header className="report-header">
          <h1 className="report-title">📊 Resource Demand Report</h1>
          <p className="report-subtitle">Analysis of resource availability vs. demand from bookings</p>

          {/* Download PDF button placed under subtitle */}
         <div style={{ marginTop: 12 }}>
          <button
            onClick={generatePDF}
            style={{
              background: "linear-gradient(135deg, #2e7d32, #4caf50)",
              color: "white",
              border: "none",
              padding: "10px 18px",
              fontSize: "15px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "500",
              boxShadow: "0 3px 6px rgba(0, 0, 0, 0.15)",
              transition: "background 0.3s ease, transform 0.2s ease",
            }}
            onMouseOver={(e) => (e.target.style.transform = "scale(1.05)")}
            onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
          >
            ⬇️ Download PDF Report
          </button>
        </div>
        </header>

        <main className="report-main">
          {loading ? (
            <div className="loading-indicator">
              <div className="spinner" />
              <p>Loading report data...</p>
            </div>
          ) : error ? (
            <div className="error-message">
              <p>{error}</p>
            </div>
          ) : reportData.length === 0 ? (
            <p>No report data available.</p>
          ) : (
            <div className="table-container">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Resource</th>
                    <th>Type</th>
                    <th>Available</th>
                    <th>Demand (Qty)</th>
                    <th>Shortage</th>
                    <th>Season</th>
                    <th>Status</th>
                    <th>Charts</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((item, index) => (
                    <React.Fragment key={index}>
                      <tr className={item.status === "Shortage" ? "row-shortage" : "row-sufficient"}>
                        <td>{item.resource}</td>
                        <td>{item.type}</td>
                        <td className="center">{item.available}</td>
                        <td className="center">{item.demand}</td>
                        <td className="center">{item.shortage}</td>
                        <td>{item.season}</td>
                        <td className="center">
                          <span className={`status-tag ${item.status === "Shortage" ? "shortage" : "sufficient"}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="center">
                          <button onClick={() => fetchChartData(item.resourceId)} className="chart-toggle-btn">
                            {expandedCharts[item.resourceId] ? "Hide Charts" : "Show Charts"}
                          </button>
                        </td>
                      </tr>

                      {expandedCharts[item.resourceId] && chartData[item.resourceId] && (
                        <tr className="chart-row">
                          <td colSpan="8">
                            <div className="charts-container">
                              <div className="chart-navigation">
                                <button onClick={() => handleChartSwitch(item.resourceId, -1)}>◀</button>
                                <span>{chartTitles[activeChartType[item.resourceId]]}</span>
                                <button onClick={() => handleChartSwitch(item.resourceId, 1)}>▶</button>
                              </div>
                              <div className="chart-wrapper" style={{ height: "400px" }}>
                                {(() => {
                                  const type = activeChartType[item.resourceId];
                                  const data = chartData[item.resourceId]?.[type];
                                  if (!data) return null;
                                  const commonOptions = { responsive: true, maintainAspectRatio: false };
                                  if (type === "lineChartData") return <Line data={data} options={commonOptions} />;
                                  if (type === "pieChartData") return <Pie data={data} options={commonOptions} />;
                                  if (type === "barChartData") return <Bar data={data} options={commonOptions} />;
                                  return null;
                                })()}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* Hidden container for aggregate charts used in the PDF */}
      <div
        ref={pdfChartContainerRef}
        style={{
          position: "fixed",
          left: -9999,
          top: -9999,
          width: 1000,
          background: "#fff",
          padding: 20,
        }}
        aria-hidden
      >
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ color: "rgb(34,102,34)" }}>Bookings Per Month</h2>
          <div style={{ width: 900, height: 300 }}>
            <Line ref={lineChartRef} data={lineData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 12 }}>Caption: Monthly confirmed & pending bookings for the current year.</div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h2 style={{ color: "rgb(120,72,0)" }}>Revenue Per Season</h2>
          <div style={{ width: 900, height: 300 }}>
            <Pie ref={pieChartRef} data={pieData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 12 }}>Caption: Estimated revenue per agricultural season (demand × price).</div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h2 style={{ color: "rgb(34,102,34)" }}>Total Unit Hours (current month)</h2>
          <div style={{ width: 900, height: 300 }}>
            <Bar ref={barChartRef} data={barData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 12 }}>Caption: Sum of booking hours per day for the current month (when possible).</div>
        </div>
      </div>
    </div>
  );
};

export default DemandReport;
