const { jsPDF } = require('jspdf');
const Payment = require('../models/Payment');

/**
 * GET /api/payments/:id/invoice
 * Generate and return a PDF invoice for a payment.
 * Identical layout to the web admin PaymentManager invoice.
 */
async function generateInvoice(req, res) {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Ensure requesting customer can only access their own invoices
    if (req.user && req.user.role === 'customer' && payment.customerId) {
      if (String(payment.customerId) !== String(req.user.sub)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const doc = new jsPDF();

    let discount = parseFloat(payment.discount || 0);
    if (discount === 0 && payment.description) {
      const match = payment.description.match(/Loyalty Discount:\s*Rs\.?\s*([0-9.]+)/i);
      if (match) discount = parseFloat(match[1]) || 0;
    }

    const finalAmount = parseFloat(payment.amount || 0);
    const subtotal = parseFloat(payment.subtotal || finalAmount + discount);
    const invoiceNumber =
      payment.invoiceId || payment.appointmentId || `INV-${Date.now().toString().slice(-6)}`;
    const invoiceDate = payment.createdAt
      ? new Date(payment.createdAt).toLocaleDateString('en-LK')
      : payment.date || new Date().toLocaleDateString('en-LK');
    const paymentMethod = (payment.paymentMethod || 'CASH').toUpperCase();
    const paymentStatus = (payment.status || 'COMPLETED').toUpperCase();

    // Warm Amber / Golden Header styling (Project theme: #f39c12 / #e67e22)
    doc.setFillColor(243, 156, 18);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('SMART SERVICE CENTER', 20, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Automotive Care & Smart Diagnostics | Official Invoice', 20, 25);

    // Invoice Meta
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.text(`Invoice No: ${invoiceNumber}`, 20, 42);
    doc.text(`Date: ${invoiceDate}`, 20, 48);
    doc.text(`Appointment: ${payment.appointmentId || 'Walk-In / Direct'}`, 20, 54);

    doc.text(`Customer: ${payment.customerName || 'N/A'}`, 130, 42);
    doc.text(`Payment Method: ${paymentMethod}`, 130, 48);
    doc.text(`Status: ${paymentStatus}`, 130, 54);

    // Table Header
    let yPos = 65;
    doc.setFillColor(254, 245, 231);
    doc.rect(20, yPos, 170, 8, 'F');
    doc.setTextColor(211, 84, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('ITEM / DESCRIPTION', 24, yPos + 6);
    doc.text('QTY', 120, yPos + 6);
    doc.text('UNIT PRICE (Rs.)', 140, yPos + 6);
    doc.text('AMOUNT (Rs.)', 170, yPos + 6);

    yPos += 12;
    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'normal');

    let itemNumber = 1;

    // Base Service row
    if (payment.serviceName || payment.serviceCost > 0) {
      const srvName = payment.serviceName || 'Automotive Service Package';
      const srvCost = parseFloat(payment.serviceCost || subtotal).toFixed(2);
      doc.text(`${itemNumber++}. Service: ${srvName}`, 24, yPos);
      doc.text('1', 122, yPos);
      doc.text(srvCost, 142, yPos);
      doc.text(srvCost, 172, yPos);
      yPos += 8;
    }

    // Spare parts rows
    if (Array.isArray(payment.items) && payment.items.length > 0) {
      payment.items.forEach((item) => {
        const itemTotal = parseFloat(item.total || item.quantity * item.unitPrice).toFixed(2);
        doc.text(`${itemNumber++}. Part: ${item.name}`, 24, yPos);
        doc.text(String(item.quantity || 1), 122, yPos);
        doc.text(parseFloat(item.unitPrice || 0).toFixed(2), 142, yPos);
        doc.text(itemTotal, 172, yPos);
        yPos += 8;
      });
    }

    // Itemized Labor tasks rows
    if (Array.isArray(payment.laborItems) && payment.laborItems.length > 0) {
      payment.laborItems.forEach((labor) => {
        const laborCost = parseFloat(labor.cost || 0).toFixed(2);
        doc.text(`${itemNumber++}. Labor: ${labor.taskName}`, 24, yPos);
        doc.text('1', 122, yPos);
        doc.text(laborCost, 142, yPos);
        doc.text(laborCost, 172, yPos);
        yPos += 8;
      });
    } else if (payment.laborCost && payment.laborCost > 0) {
      doc.text(`${itemNumber++}. Additional Labor Charges`, 24, yPos);
      doc.text('1', 122, yPos);
      doc.text(parseFloat(payment.laborCost).toFixed(2), 142, yPos);
      doc.text(parseFloat(payment.laborCost).toFixed(2), 172, yPos);
      yPos += 8;
    }

    // Divider
    doc.setDrawColor(230, 230, 230);
    doc.line(20, yPos, 190, yPos);
    yPos += 8;

    // Totals Breakdown
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', 130, yPos);
    doc.text(`Rs. ${subtotal.toFixed(2)}`, 170, yPos);
    yPos += 6;

    if (discount > 0) {
      doc.setTextColor(231, 76, 60);
      doc.text('Loyalty Discount:', 130, yPos);
      doc.text(`- Rs. ${discount.toFixed(2)}`, 170, yPos);
      yPos += 6;
      doc.setTextColor(50, 50, 50);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Grand Total Paid:', 130, yPos + 2);
    doc.setTextColor(211, 84, 0);
    doc.text(`Rs. ${finalAmount.toFixed(2)}`, 170, yPos + 2);

    // Notes
    yPos += 20;
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    if (payment.description) {
      doc.text(`Notes: ${payment.description}`, 20, yPos);
      yPos += 8;
    }

    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Thank you for trusting Smart Service Center for your vehicle care!', 20, 275);
    doc.text('Computer Generated Invoice — Valid without signature', 20, 280);

    // Generate PDF buffer and send
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    const filename = `invoice-${String(invoiceNumber).replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error('Invoice generation error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/payments/by-appointment/:code
 * Find payment by appointment confirmation code
 */
async function getPaymentByAppointment(req, res) {
  try {
    const { code } = req.params;
    const payment = await Payment.findOne({ appointmentId: code });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found for this appointment' });
    }

    // Ensure customer can only access their own payment
    if (req.user && req.user.role === 'customer' && payment.customerId) {
      if (String(payment.customerId) !== String(req.user.sub)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const obj = payment.toObject({ versionKey: false });
    obj.id = obj._id;
    delete obj._id;

    return res.status(200).json({ payment: obj });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  generateInvoice,
  getPaymentByAppointment
};
