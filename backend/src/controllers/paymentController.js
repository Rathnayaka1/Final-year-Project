const Payment = require('../models/Payment');
const Appointment = require('../models/Appointment');
const Stock = require('../models/Stock');
const { createNotification } = require('./notificationController');

function serializePayment(doc) {
  const payment = doc.toObject({ versionKey: false });
  payment.id = payment._id;
  delete payment._id;
  return payment;
}

async function getPayments(req, res) {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    return res.status(200).json({ payments: payments.map(serializePayment) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function createPayment(req, res) {
  try {
    const {
      customerId,
      customerName,
      appointmentId,
      serviceName,
      serviceCost,
      laborCost,
      laborItems,
      items,
      amount,
      subtotal,
      discount,
      tax,
      paymentMethod,
      status,
      description,
      invoiceId,
      nextServiceDate,
      nextServiceMileage
    } = req.body || {};

    if (!customerName) {
      return res.status(400).json({ error: 'Customer name is required' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || (numericAmount < 0 && status !== 'failed')) {
      return res.status(400).json({ error: 'Payment amount must be valid' });
    }

    const generatedInvoiceId = invoiceId || `INV-${Date.now().toString().slice(-6)}`;

    // Parse and sanitize items array
    const sanitizedItems = Array.isArray(items)
      ? items.map(item => ({
          stockId: item.stockId || null,
          name: item.name || '',
          quantity: Math.max(1, Number(item.quantity || 1)),
          unitPrice: Math.max(0, Number(item.unitPrice || 0)),
          total: Math.max(0, Number(item.total || (Number(item.quantity || 1) * Number(item.unitPrice || 0))))
        }))
      : [];

    // Parse and sanitize laborItems array
    const sanitizedLaborItems = Array.isArray(laborItems)
      ? laborItems.map(item => ({
          taskName: item.taskName || item.name || '',
          cost: Math.max(0, Number(item.cost || item.price || 0))
        }))
      : [];

    const computedLaborCost = sanitizedLaborItems.length > 0
      ? sanitizedLaborItems.reduce((sum, item) => sum + item.cost, 0)
      : (laborCost !== undefined ? parseFloat(laborCost) : 0);

    // Auto-resolve customerId from appointment if not provided
    let resolvedCustomerId = customerId || null;
    if (!resolvedCustomerId && appointmentId) {
      try {
        const linkedAppointment = await Appointment.findOne({
          $or: [
            { confirmationCode: appointmentId.trim().toUpperCase() },
            { _id: appointmentId.match(/^[0-9a-fA-F]{24}$/) ? appointmentId : null }
          ]
        }).select('customer');
        if (linkedAppointment?.customer) {
          resolvedCustomerId = linkedAppointment.customer;
        }
      } catch (e) {
        // silently ignore lookup failure
      }
    }

    const payment = await Payment.create({
      customerId: resolvedCustomerId,
      customerName: customerName.trim(),
      appointmentId: (appointmentId || '').trim(),
      serviceName: (serviceName || '').trim(),
      serviceCost: serviceCost !== undefined ? parseFloat(serviceCost) : 0,
      laborCost: computedLaborCost,
      laborItems: sanitizedLaborItems,
      items: sanitizedItems,
      amount: numericAmount,
      subtotal: subtotal !== undefined ? parseFloat(subtotal) : numericAmount,
      discount: discount !== undefined ? parseFloat(discount) : 0,
      tax: tax !== undefined ? parseFloat(tax) : 0,
      paymentMethod: paymentMethod || 'cash',
      status: status || 'completed',
      description: (description || '').trim(),
      invoiceId: generatedInvoiceId,
      nextServiceDate: (nextServiceDate || '').trim(),
      nextServiceMileage: parseFloat(nextServiceMileage) || 0,
      date: new Date().toLocaleDateString()
    });

    // Deduct stock quantities if parts were used and payment is completed
    if (sanitizedItems.length > 0 && (status === 'completed' || !status)) {
      for (const item of sanitizedItems) {
        try {
          if (item.stockId) {
            await Stock.findByIdAndUpdate(item.stockId, {
              $inc: { quantity: -item.quantity }
            });
          } else if (item.name) {
            await Stock.findOneAndUpdate(
              { partName: new RegExp(`^${item.name.trim()}$`, 'i') },
              { $inc: { quantity: -item.quantity } }
            );
          }
        } catch (stockErr) {
          console.warn('Could not deduct stock for item:', item.name, stockErr.message);
        }
      }
    }

    // If an appointmentId is attached and status is completed, update appointment if found
    if (appointmentId && (status === 'completed' || !status)) {
      try {
        const appointmentFilter = {
          $or: [
            { confirmationCode: appointmentId },
            { _id: appointmentId.match(/^[0-9a-fA-F]{24}$/) ? appointmentId : null }
          ]
        };

        const appointmentUpdate = {
          status: 'completed',
          queueStatus: 'completed',
          actualCost: numericAmount,
          completedAt: new Date()
        };

        if (sanitizedItems.length > 0) {
          appointmentUpdate.partsReplaced = sanitizedItems.map(i => ({
            name: i.name,
            cost: i.unitPrice,
            quantity: i.quantity
          }));
        }

        await Appointment.findOneAndUpdate(appointmentFilter, appointmentUpdate);
      } catch (err) {
        console.warn('Could not update appointment on payment:', err.message);
      }
    }

    // Notify customer about completed payment
    if (payment.customerId && (payment.status === 'completed')) {
      createNotification({
        recipientId: payment.customerId,
        type: 'general',
        title: 'Payment Completed',
        message: `Payment of Rs.${numericAmount.toFixed(2)} for ${payment.serviceName || 'your service'} has been completed. Invoice: ${generatedInvoiceId}`,
        data: { paymentId: payment._id, invoiceId: generatedInvoiceId, amount: numericAmount }
      });
    }

    return res.status(201).json({ payment: serializePayment(payment) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// Get upcoming due service reminders (within next 7 days)
async function getDueServiceReminders(req, res) {
  try {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 7);

    const todayStr = today.toISOString().split('T')[0];
    const futureStr = futureDate.toISOString().split('T')[0];

    const duePayments = await Payment.find({
      customerId: { $ne: null },
      nextServiceDate: { $gte: todayStr, $lte: futureStr }
    }).sort({ nextServiceDate: 1 });

    return res.status(200).json({
      duePayments: duePayments.map(serializePayment),
      range: { start: todayStr, end: futureStr }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// Check and trigger reminder notifications for upcoming services
async function checkAndSendServiceReminders(req, res) {
  try {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 7);

    const todayStr = today.toISOString().split('T')[0];
    const futureStr = futureDate.toISOString().split('T')[0];

    const duePayments = await Payment.find({
      customerId: { $ne: null },
      nextServiceDate: { $gte: todayStr, $lte: futureStr }
    });

    let sentCount = 0;
    for (const p of duePayments) {
      const alreadySent = await Notification.findOne({
        recipient: p.customerId,
        type: 'appointment_reminder',
        'data.nextServiceDate': p.nextServiceDate
      });

      if (!alreadySent) {
        const mileageVal = p.nextServiceMileage || 0;
        const mileageText = mileageVal > 0 ? ` (Target: ${mileageVal.toLocaleString()} km)` : '';

        await Notification.create({
          recipient: p.customerId,
          recipientModel: 'Customer',
          type: 'appointment_reminder',
          title: '⏰ Upcoming Vehicle Service Reminder',
          message: `Friendly reminder: Your vehicle is due for periodic maintenance on ${p.nextServiceDate}${mileageText}. Book your appointment in advance to reserve your preferred slot!`,
          data: {
            paymentId: p._id,
            nextServiceDate: p.nextServiceDate,
            nextServiceMileage: mileageVal
          }
        });
        sentCount++;
      }
    }

    if (res) {
      return res.status(200).json({
        success: true,
        message: `Processed service reminders. Sent ${sentCount} new notifications.`,
        sentCount,
        range: { start: todayStr, end: futureStr }
      });
    }
    return { sentCount };
  } catch (error) {
    if (res) return res.status(500).json({ error: error.message });
    console.error('Error in checkAndSendServiceReminders:', error.message);
  }
}

async function updatePayment(req, res) {
  try {
    const { id } = req.params;
    const { status, paymentMethod, description, discount, amount } = req.body || {};

    const updateFields = {};
    if (status) updateFields.status = status;
    if (paymentMethod) updateFields.paymentMethod = paymentMethod;
    if (description !== undefined) updateFields.description = description;
    if (discount !== undefined) updateFields.discount = parseFloat(discount);
    if (amount !== undefined) updateFields.amount = parseFloat(amount);

    const updated = await Payment.findByIdAndUpdate(id, updateFields, { new: true });
    if (!updated) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    return res.status(200).json({ payment: serializePayment(updated) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function deletePayment(req, res) {
  try {
    const { id } = req.params;
    const deleted = await Payment.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    return res.status(200).json({ success: true, message: 'Payment deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getPayments,
  createPayment,
  updatePayment,
  deletePayment,
  getDueServiceReminders,
  checkAndSendServiceReminders
};
