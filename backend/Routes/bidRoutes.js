const express = require('express');
const router = express.Router();
const Land = require('../Model/Land');
const json2csv = require('json2csv').Parser;
const PDFDocument = require('pdfkit');

// POST create new bid for a specific land
router.post('/:landId', async (req, res) => {
  try {
    const { landId } = req.params;
    const { bidderName, mobileNumber, NIC, bidAmount } = req.body;
    // Validate required fields
    if (!bidderName || !mobileNumber || !NIC || !bidAmount) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: bidderName, mobileNumber, NIC, bidAmount'
      });
    } 
    
    // Validate mobile number format
    if (!/^[0-9]{10,15}$/.test(mobileNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid mobile number (10-15 digits)'
      });
    }

     // Validate NIC number format
    if (!NIC || !/^[0-9]{9}[vVxX]$|^[0-9]{12}$/.test(NIC)) { // <--- Corrected validation
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid NIC number'
      });
    }

    
    // Validate bid amount
    if (isNaN(bidAmount) || parseFloat(bidAmount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Bid amount must be a positive number'
      });
    }
    
    const land = await Land.findById(landId);
    
    if (!land) {
      return res.status(404).json({
        success: false,
        message: 'Land not found'
      });
    }
    
    // Check if bidding is still active (within 7 days)
    if (!land.isBiddingActive) {
      return res.status(403).json({
        success: false,
        message: 'Bidding period has expired. Bids are only accepted within 7 days of land creation.'
      });
    }
    
    // Check if bid amount is higher than the base amount
    if (parseFloat(bidAmount) <= land.amount) {
      return res.status(400).json({
        success: false,
        message: `Bid amount must be higher than the base amount of LKR ${land.amount}`
      });
    }
    
    // Check if this mobile number has already placed a bid
    const existingBid = land.bids.find(bid => bid.mobileNumber === mobileNumber);
    if (existingBid) {
      return res.status(400).json({
        success: false,
        message: 'You have already placed a bid for this land. Multiple bids from the same mobile number are not allowed.'
      });
    }
    
    // Create new bid
    const newBid = {
      bidderName: bidderName.trim(),
      mobileNumber: mobileNumber.trim(),
      NIC: NIC.trim(),
      bidAmount: parseFloat(bidAmount),
      timestamp: new Date()
    };

    // Atomic push update to avoid validating unrelated fields on entire document
    const updatedLand = await Land.findByIdAndUpdate(
      landId,
      { $push: { bids: newBid } },
      { new: true, runValidators: true, context: 'query' }
    );

    if (!updatedLand) {
      return res.status(404).json({ success: false, message: 'Land not found' });
    }

    // Get the created bid (last element)
    const createdBid = updatedLand.bids[updatedLand.bids.length - 1];

    return res.status(201).json({
      success: true,
      message: 'Bid placed successfully',
      data: {
        bid: createdBid,
        landInfo: {
          id: updatedLand._id,
          ownerName: updatedLand.ownerName,
          location: updatedLand.location.address,
          daysRemaining: updatedLand.daysRemaining
        }
      }
    });
  } catch (error) {
    // Send clearer validation errors where possible
    const isValidationError = error.name === 'ValidationError';
    return res.status(isValidationError ? 400 : 500).json({
      success: false,
      message: isValidationError ? error.message : 'Error placing bid',
      error: error.message
    });
  }
});

// GET all bids for a specific land (alternative endpoint)
router.get('/:landId', async (req, res) => {
  try {
    const { landId } = req.params;
    const land = await Land.findById(landId);
    
    if (!land) {
      return res.status(404).json({
        success: false,
        message: 'Land not found'
      });
    }
    
    // Check if bidding is still active (within 7 days)
    if (!land.isBiddingActive) {
      return res.json({
        success: true,
        status: 'Bidding closed',
        message: 'Bidding period has expired',
        data: [],
        daysRemaining: 0,
        landInfo: {
          id: land._id,
          ownerName: land.ownerName,
          location: land.location.address,
          baseAmount: land.amount
        }
      });
    }
    
    // Sort bids by amount in descending order
    const sortedBids = land.bids.sort((a, b) => b.bidAmount - a.bidAmount);
    
    res.json({
      success: true,
      status: 'Active',
      data: sortedBids,
      daysRemaining: land.daysRemaining,
      landInfo: {
        id: land._id,
        ownerName: land.ownerName,
        location: land.location.address,
        baseAmount: land.amount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching bids',
      error: error.message
    });
  }
});

// DELETE a specific bid (optional - for admin purposes)
router.delete('/:landId/:bidId', async (req, res) => {
  try {
    const { landId, bidId } = req.params;
    
    const land = await Land.findById(landId);
    
    if (!land) {
      return res.status(404).json({
        success: false,
        message: 'Land not found'
      });
    }
    
    // Find and remove the bid
    const bidIndex = land.bids.findIndex(bid => bid._id.toString() === bidId);
    
    if (bidIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Bid not found'
      });
    }
    
    land.bids.splice(bidIndex, 1);
    await land.save();
    
    res.json({
      success: true,
      message: 'Bid deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting bid',
      error: error.message
    });
  }
});

// GET bid statistics for a land
router.get('/:landId/stats', async (req, res) => {
  try {
    const { landId } = req.params;
    const land = await Land.findById(landId);
    
    if (!land) {
      return res.status(404).json({
        success: false,
        message: 'Land not found'
      });
    }
    
    const bids = land.bids;
    const totalBids = bids.length;
    const totalBidAmount = bids.reduce((sum, bid) => sum + bid.bidAmount, 0);
    const highestBid = bids.length > 0 ? Math.max(...bids.map(bid => bid.bidAmount)) : 0;
    const lowestBid = bids.length > 0 ? Math.min(...bids.map(bid => bid.bidAmount)) : 0;
    const averageBidAmount = totalBids > 0 ? totalBidAmount / totalBids : 0;
    
    const stats = {
      totalBids,
      totalBidAmount,
      highestBid,
      lowestBid,
      averageBidAmount: parseFloat(averageBidAmount.toFixed(2)),
      baseAmount: land.amount,
      bidIncrease: highestBid > 0 ? parseFloat(((highestBid - land.amount) / land.amount * 100).toFixed(2)) : 0,
      isBiddingActive: land.isBiddingActive,
      daysRemaining: land.daysRemaining
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching bid statistics',
      error: error.message
    });
  }
});

// GET report download (CSV/PDF) for a specific land
router.get('/:landId/report/:format', async (req, res) => {
  try {
    const { landId, format } = req.params;
    
    if (!['csv', 'pdf'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Use csv or pdf'
      });
    }
    
    const land = await Land.findById(landId);
    
    if (!land) {
      return res.status(404).json({
        success: false,
        message: 'Land not found'
      });
    }
    
    const bids = land.bids;
    const stats = {
      totalBids: bids.length,
      totalBidAmount: bids.reduce((sum, bid) => sum + bid.bidAmount, 0),
      highestBid: bids.length > 0 ? Math.max(...bids.map(bid => bid.bidAmount)) : 0,
      averageBidAmount: bids.length > 0 ? (bids.reduce((sum, bid) => sum + bid.bidAmount, 0) / bids.length).toFixed(2) : 0
    };
    
  // CSV and PDF report generation (NIC field included with fallback)
  if (format === 'csv') {
    const csvData = bids.map(bid => ({
      'Bidder Name': bid.bidderName,
      'Mobile Number': bid.mobileNumber,
      'NIC': bid.NIC || '-',
      'Bid Amount': bid.bidAmount,
      'Date': new Date(bid.timestamp).toLocaleDateString(),
      'Time': new Date(bid.timestamp).toLocaleTimeString()
    }));
      
    const csvFields = ['Bidder Name', 'Mobile Number', 'NIC', 'Bid Amount', 'Date', 'Time'];
    const csvParser = new json2csv({ fields: csvFields });
    const csvContent = csvParser.parse(csvData);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=land-${landId}-bids-report.csv`);
      res.send(csvContent);
      
    } else if (format === 'pdf') {
      // Generate a nicer, printable PDF using pdfkit
      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=land-${landId}-bids-report.pdf`);

      doc.pipe(res);

      // Helpers
      const margin = 50;
      const pageWidth = doc.page.width;
      const usableWidth = pageWidth - margin * 2;
      const rightColumnX = margin + usableWidth * 0.6;

      const formatCurrency = (value) => {
        try {
          return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(value);
        } catch (e) {
          return `LKR ${value}`;
        }
      };

      const formatDate = (d) => {
        if (!d) return '-';
        return new Date(d).toLocaleDateString();
      };

  // Header / Branding
  // Top banner (solid color) with white title text
  doc.save();
  doc.fillColor('#2ecc71').rect(margin, 30, usableWidth, 70).fill();
  doc.fillColor('#ffffff').fontSize(22).text('Land Bidding Report', margin + 18, 44);
  // Branding text and timestamp on the right (white)
  doc.fontSize(10).text('Suhuru Waga', rightColumnX, 48, { align: 'right' });
  doc.fontSize(9).text(`Generated: ${new Date().toLocaleString()}`, rightColumnX, 64, { align: 'right' });
  doc.restore();

  // Land summary
  let y = 120;
  doc.fillColor('#0b3d0b').fontSize(12).text(`Owner: ${land.ownerName || '-'}`, margin, y);
  doc.fillColor('#0b3d0b').text(`Location: ${land.location?.address || '-'}`, margin, y + 18);
  doc.fillColor('#0b3d0b').text(`Base Amount: ${formatCurrency(land.amount)}`, margin, y + 36);

  // Stats box on the right — light background + visible border
  const statsBoxX = rightColumnX;
  const statsBoxWidth = usableWidth - (statsBoxX - margin);
  doc.save();
  doc.fillColor('#f3fff3').roundedRect(statsBoxX, y - 6, statsBoxWidth, 68, 8).fill();
  doc.strokeColor('#cfefd0').roundedRect(statsBoxX, y - 6, statsBoxWidth, 68, 8).stroke();
  doc.restore();
  doc.fillColor('#0b3d0b').fontSize(11).text('Statistics', statsBoxX + 10, y - 2);
  doc.fontSize(10).fillColor('#234').text(`Total Bids: ${stats.totalBids}`, statsBoxX + 10, y + 14);
  doc.text(`Highest Bid: ${formatCurrency(stats.highestBid)}`, statsBoxX + 10, y + 30);
  doc.text(`Average Bid: ${formatCurrency(stats.averageBidAmount)}`, statsBoxX + 10, y + 46);

  // Table header
  y += 90;
  // header separator
  doc.moveTo(margin, y - 10).lineTo(margin + usableWidth, y - 10).lineWidth(0.7).stroke('#cfcfcf');
  const colWidths = [usableWidth * 0.32, usableWidth * 0.18, usableWidth * 0.18, usableWidth * 0.16, usableWidth * 0.16];
  const colsX = [margin];
  for (let i = 1; i < colWidths.length; i++) colsX[i] = colsX[i - 1] + colWidths[i - 1];

  doc.fontSize(11).fillColor('#0b3d0b').font('Helvetica-Bold');
  doc.text('Bidder Name', colsX[0] + 6, y, { width: colWidths[0] - 12 });
  doc.text('Mobile', colsX[1] + 6, y, { width: colWidths[1] - 12 });
  doc.text('NIC', colsX[2] + 6, y, { width: colWidths[2] - 12 });
  doc.text('Amount', colsX[3] + 6, y, { width: colWidths[3] - 12, align: 'right' });
  doc.text('Date', colsX[4] + 6, y, { width: colWidths[4] - 12, align: 'right' });
  doc.font('Helvetica');

  y += 22;

      // Rows
      bids.forEach((bid, index) => {
        // Page break if needed
        if (y > doc.page.height - margin - 60) {
          doc.addPage();
          y = margin + 20;
          // redraw table header on new page
          doc.fontSize(11).fillColor('#0b3d0b');
          doc.text('Bidder Name', colsX[0] + 6, y, { width: colWidths[0] - 12 });
          doc.text('Mobile', colsX[1] + 6, y, { width: colWidths[1] - 12 });
          doc.text('NIC', colsX[2] + 6, y, { width: colWidths[2] - 12 });
          doc.text('Amount', colsX[3] + 6, y, { width: colWidths[3] - 12, align: 'right' });
          doc.text('Date', colsX[4] + 6, y, { width: colWidths[4] - 12, align: 'right' });
          y += 22;
        }

        // alternating background (light, not too faint)
        if (index % 2 === 0) {
          doc.save();
          doc.fillColor('#f7fff7').rect(margin, y - 6, usableWidth, 20).fill();
          doc.restore();
        }

        const bidder = bid.bidderName || '-';
        const mobile = bid.mobileNumber || '-';
        const nic = bid.NIC || '-';
        const amount = formatCurrency(bid.bidAmount);
        const date = formatDate(bid.timestamp);

  doc.fillColor('#111').fontSize(10);
        doc.text(bidder, colsX[0] + 6, y, { width: colWidths[0] - 12 });
        doc.text(mobile, colsX[1] + 6, y, { width: colWidths[1] - 12 });
        doc.text(nic, colsX[2] + 6, y, { width: colWidths[2] - 12 });
        doc.text(amount, colsX[3] + 6, y, { width: colWidths[3] - 12, align: 'right' });
        doc.text(date, colsX[4] + 6, y, { width: colWidths[4] - 12, align: 'right' });

        y += 22;

        // add subtle row divider
        doc.moveTo(margin, y + 6).lineTo(margin + usableWidth, y + 6).lineWidth(0.3).stroke('#eeeeee');
      });

      // Footer note
      doc.fontSize(9).fillColor('#666').text('This report was generated by Suhuru Waga.', margin, doc.page.height - margin - 30, { align: 'center', width: usableWidth });

      doc.end();
    }
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating report',
      error: error.message
    });
  }
});

module.exports = router;