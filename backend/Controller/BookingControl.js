const mongoose = require("mongoose");
const Booking = require("../Model/BookingModel");
const Resource = require("../Model/Resources");
const path = require("path");
const multer = require("multer");


const getBookingHistoryChartData = async (req, res) => {
  const { resourceId } = req.params;

  try {
    // Only use Confirmed bookings for chart data
    const bookings = await Booking.find({ resourceId, status: "Confirmed" });

    if (bookings.length === 0) {
      return res.status(200).json({
        lineChartData: {
          labels: [],
          datasets: [],
        },
        pieChartData: {
          labels: [],
          datasets: [],
        },
        barChartData: {
          labels: [],
          datasets: [],
        },
      });
    }

    // === Line Chart: Bookings per Month ===
    const monthlyCounts = Array(12).fill(0);
    bookings.forEach((b) => {
      const month = new Date(b.date).getMonth(); // Jan = 0
      monthlyCounts[month]++;
    });

    const lineChartData = {
      labels: [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ],
      datasets: [
        {
          label: "Bookings Per Month",
          data: monthlyCounts,
          borderColor: "rgba(75,192,192,1)",
          backgroundColor: "rgba(75,192,192,0.2)",
          tension: 0.4,
        },
      ],
    };

    // === Pie Chart: Revenue per Season (Maha vs Yala) ===
    const seasonRevenue = { Maha: 0, Yala: 0 };

    bookings.forEach((b) => {
      const month = new Date(b.date).getMonth() + 1; // 1-based month
      const season = month >= 3 && month <= 8 ? "Yala" : "Maha";
      seasonRevenue[season] += b.totalAmount || 0;
    });

    const pieChartData = {
      labels: ["Yala", "Maha"],
      datasets: [
        {
          data: [seasonRevenue.Yala, seasonRevenue.Maha],
          backgroundColor: ["#36A2EB", "#FF6384"],
        },
      ],
    };

    // === Bar Chart: Total Unit Hours ===
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const dailyUsage = Array.from({ length: 31 }, () => 0);

    bookings.forEach((b) => {
      const date = new Date(b.date);
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      if (month === currentMonth && year === currentYear) {
        dailyUsage[day - 1] += b.durationHours || 0;
      }
    });

    // Initialize usage per month
    const monthlyUsage = Array(12).fill(0);

    bookings.forEach((b) => {
      const date = new Date(b.date);
      const month = date.getMonth(); // 0-indexed
      monthlyUsage[month] += b.durationHours || 0;
    });

    const barChartData = {
      labels: [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
      ],
      datasets: [
        {
          label: "Resource Usage (Hours)",
          data: monthlyUsage,
          backgroundColor: "rgba(153, 102, 255, 0.6)",
        },
      ],
    };

    // === Final response ===
    res.status(200).json({
      lineChartData,
      pieChartData,
      barChartData,
    });
  } catch (err) {
    console.error("Error generating chart data:", err);
    res.status(500).json({ error: "Failed to generate chart data", details: err.message });
  }
};

// ===================== OTHER CONTROLLERS =====================
const createBooking = async (req, res) => {
  try {
    const {
      resourceId,
      farmerId,
      farmerName,
      farmerContact,
      farmerEmail,
      date,
      durationHours,
      partialPayment,
      totalAmount,
      deliveryLocation,
      deliveryAddress,
    } = req.body;

    if (!resourceId || typeof resourceId !== "string")
      return res.status(400).json({ message: "Invalid resourceId" });
    if (!farmerId || typeof farmerId !== "string")
      return res.status(400).json({ message: "Invalid farmerId" });

    const resource = await Resource.findOne({ _id: resourceId });
    if (!resource) return res.status(404).json({ message: "Resource not found" });

    const booking = new Booking({
      resourceId,
      farmerId,
      farmerName,
      farmerContact,
      farmerEmail,
      date,
      durationHours,
      partialPayment,
      totalAmount,
      deliveryLocation,
      deliveryAddress,
    });

    await booking.save();

    res.status(201).json({
      message: partialPayment
        ? "Booking request submitted with partial payment. Await confirmation."
        : "Booking request submitted. Await confirmation.",
      booking,
    });
  } catch (error) {
    console.error("Booking creation error:", error);
    res.status(500).json({ message: "Failed to create booking", error });
  }
};

const uploadReceipt = async (req, res) => {
  try {
    const bookingId = req.params.id;
    console.log("Upload receipt request received for booking:", bookingId);

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      console.warn("Booking not found:", bookingId);
      return res.status(404).json({ message: "Booking not found" });
    }

    if (!req.file) {
      console.warn("No file uploaded for booking:", bookingId);
      return res.status(400).json({ message: "No file uploaded" });
    }

    console.log("File received:", req.file.filename);

    // ✅ Only store receipt and keep status as Pending
    booking.receiptFileName = req.file.filename;
    booking.status = "Pending";

    await booking.save();
    console.log("Booking updated with receipt (status remains Pending):", booking);

    res.status(200).json({ message: "Receipt uploaded. Waiting for owner confirmation.", booking });
  } catch (err) {
    console.error("Upload receipt error:", err);
    res.status(500).json({ message: "Failed to upload receipt", error: err.message });
  }
};


const bulkCreateBookings = async (req, res) => {
  try {
    const bookingsData = req.body.bookings;
    if (!Array.isArray(bookingsData) || bookingsData.length === 0)
      return res.status(400).json({ message: "No bookings provided" });

    const validBookings = bookingsData.map((b) => {
      if (!b.resourceId || typeof b.resourceId !== "string")
        throw new Error(`Invalid resourceId: ${b.resourceId}`);
      if (!b.farmerId || typeof b.farmerId !== "string")
        throw new Error(`Invalid farmerId: ${b.farmerId}`);
      return b;
    });

    const createdBookings = await Booking.insertMany(validBookings);
    res.status(201).json({
      message: `${createdBookings.length} bookings created successfully`,
      bookings: createdBookings,
    });
  } catch (err) {
    console.error("Bulk create error:", err);
    res.status(500).json({ message: "Failed to create bookings", error: err.message });
  }
};

const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find();
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch bookings", error });
  }
};

const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findOne({ _id: id });
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch booking", error });
  }
};

const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!["Pending", "Confirmed", "Rejected"].includes(status))
      return res.status(400).json({ message: "Invalid status value" });

    const booking = await Booking.findOneAndUpdate({ _id: id }, { status }, { new: true });
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    res.status(200).json({ message: "Booking status updated", booking });
  } catch (error) {
    res.status(500).json({ message: "Failed to update booking", error });
  }
};

const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findOneAndDelete({ _id: id });
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.status(200).json({ message: "Booking deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete booking", error });
  }
};

const bulkDeleteBookings = async (req, res) => {
  try {
    const { bookingIds } = req.body;
    const validIds = bookingIds.filter((id) => id && typeof id === "string");
    const result = await Booking.deleteMany({ _id: { $in: validIds } });
    res.status(200).json({ message: `${result.deletedCount} bookings deleted successfully` });
  } catch (err) {
    console.error("Bulk delete error:", err);
    res.status(500).json({ message: "Failed to delete bookings", error: err.message });
  }
};

const getUserBookings = async (req, res) => {
  try {
    const { userId } = req.params;
    const bookings = await Booking.find({ farmerId: userId }).sort({ date: -1 });

    const enrichedBookings = await Promise.all(
      bookings.map(async (booking) => {
        const resource = await Resource.findOne({ _id: booking.resourceId });
        return {
          ...booking.toObject(),
          resourceName: resource ? resource.name : "Unknown Resource",
          quantity: resource ? resource.availability.totalUnits : 0,
        };
      })
    );

    res.status(200).json(enrichedBookings);
  } catch (err) {
    console.error("Error fetching user bookings:", err);
    res.status(500).json({ message: "Failed to fetch bookings", error: err.message });
  }
};

const getBookingsForMyResources = async (req, res) => {
  try {
    const { userId } = req.params;
    const myResources = await Resource.find({ ownerId: userId }).select("_id name");
    const myResourceIds = myResources.map((r) => r._id);
    const bookings = await Booking.find({ resourceId: { $in: myResourceIds } }).sort({ date: -1 });

    const enrichedBookings = bookings.map((b) => {
      const resource = myResources.find((r) => r._id.toString() === b.resourceId.toString());
      return {
        ...b.toObject(),
        resourceName: resource ? resource.name : "Unknown Resource",
      };
    });

    res.status(200).json(enrichedBookings);
  } catch (err) {
    console.error("Error fetching bookings for resources:", err);
    res.status(500).json({ message: "Failed to fetch bookings", error: err.message });
  }
};

const getResourceById = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: "Resource not found" });
    res.status(200).json(resource);
  } catch (err) {
    console.error("Error fetching resource:", err);
    res.status(500).json({ message: "Failed to fetch resource", error: err.message });
  }
};

// ===================== NEW: Get bookings for a specific resource =====================
const getBookingsForResource = async (req, res) => {
  try {
    const { id } = req.params; // resource ID
    const bookings = await Booking.find({ resourceId: id });
    res.status(200).json(bookings);
  } catch (err) {
    console.error("Error fetching bookings for resource:", err);
    res.status(500).json({ message: "Failed to fetch bookings", error: err.message });
  }
};

// ===================== EXPORTS =====================
module.exports = {
  createBooking,
  bulkCreateBookings,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  deleteBooking,
  bulkDeleteBookings,
  getUserBookings,
  getBookingsForMyResources,
  uploadReceipt,
  getBookingHistoryChartData,
  getResourceById, // ✅ existing
  getBookingsForResource,
};
