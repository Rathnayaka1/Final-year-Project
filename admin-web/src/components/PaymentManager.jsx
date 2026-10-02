import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || (import.meta.env.DEV ? '/api' : 'http://10.255.111.96:5000/api');

export default function PaymentManager({ payments, customers = [], onCreate, loading, token }) {
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({
    customerId: '',
    customerName: '',
    appointmentId: '',
    amount: 0,
    paymentMethod: 'cash',
    status: 'completed',
    description: ''
  });

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [loyaltyMessage, setLoyaltyMessage] = useState('');

  const handleCustomerSelect = (e) => {
    const custId = e.target.value;
    const found = customers.find(c => (c.id || c._id) === custId);
    
    if (found) {
      setSelectedCustomer(found);
      setForm(prev => ({
        ...prev,
        customerId: found.id || found._id,
        customerName: found.name
      }));
    } else {
      setSelectedCustomer(null);
      setForm(prev => ({
        ...prev,
        customerId: '',
        customerName: ''
      }));
    }
    setPointsToRedeem(0);
    setAppliedDiscount(0);
    setLoyaltyMessage('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleApplyLoyaltyDiscount = async () => {
    if (!form.customerId) {
      alert('Please select a customer first.');
      return;
    }

    const availablePoints = Number(selectedCustomer?.loyaltyPoints || 0);
    if (pointsToRedeem <= 0) {
      alert('Please enter points to redeem.');
      return;
    }

    if (pointsToRedeem > availablePoints) {
      alert(`Insufficient points! Customer only has ${availablePoints} points.`);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/customers/loyalty/use`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          customerId: form.customerId,
          points: Number(pointsToRedeem),
          note: `Redeemed ${pointsToRedeem} points for payment discount`
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to redeem loyalty points.');
      }

      const discount = data.discountAmount || (pointsToRedeem * 50); 
      setAppliedDiscount(discount);
      setLoyaltyMessage(`Success! Discount of Rs. ${discount} applied.`);
    } catch (error) {
      alert(error.message || 'Failed to redeem loyalty points.');
    }
  };

  const finalPayableAmount = Math.max(0, parseFloat(form.amount || 0) - appliedDiscount);

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalData = {
      ...form,
      amount: finalPayableAmount,
      subtotal: parseFloat(form.amount || 0),
      discount: appliedDiscount,
      description: appliedDiscount > 0 
        ? `${form.description || ''} (Loyalty Discount: Rs. ${appliedDiscount})`.trim()
        : form.description
    };

    onCreate(finalData, () => {
      setForm({
        customerId: '',
        customerName: '',
        appointmentId: '',
        amount: 0,
        paymentMethod: 'cash',
        status: 'completed',
        description: ''
      });
      setSelectedCustomer(null);
      setPointsToRedeem(0);
      setAppliedDiscount(0);
      setLoyaltyMessage('');
      setIsCreating(false);
    });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setForm({
      customerId: '',
      customerName: '',
      appointmentId: '',
      amount: 0,
      paymentMethod: 'cash',
      status: 'completed',
      description: ''
    });
    setSelectedCustomer(null);
    setPointsToRedeem(0);
    setAppliedDiscount(0);
    setLoyaltyMessage('');
  };

  const stats = useMemo(() => {
    const total = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const completedCount = payments.filter((p) => p.status === 'completed').length;
    const pendingCount = payments.filter((p) => p.status === 'pending').length;
    const todayPayments = payments.filter((p) => {
      const paymentDate = new Date(p.createdAt || p.date);
      const today = new Date();
      return paymentDate.toDateString() === today.toDateString();
    });
    const todayTotal = todayPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    return { total, completedCount, pendingCount, todayTotal, todayCount: todayPayments.length };
  }, [payments]);

  const getStatusBadge = (status) => {
    const badges = {
      completed: { label: 'Paid', className: 'status-success' },
      pending: { label: 'Pending', className: 'status-warning' },
      failed: { label: 'Failed', className: 'status-danger' }
    };
    return badges[status] || { label: status, className: '' };
  };

  const getMethodBadge = (method) => {
    const badges = {
      cash: '💵 Cash',
      card: '💳 Card',
      online: '🌐 Online',
      upi: '📱 UPI'
    };
    return badges[method] || method;
  };

  const formatInvoiceDate = (dateValue) => {
    const value = dateValue ? new Date(dateValue) : new Date();
    return Number.isNaN(value.getTime()) ? new Date().toLocaleDateString('en-LK') : value.toLocaleDateString('en-LK');
  };

  const handleDownloadInvoice = (payment) => {
    const doc = new jsPDF();
    
    let discount = parseFloat(payment.discount || 0);
    if (discount === 0 && payment.description) {
      const match = payment.description.match(/Loyalty Discount:\s*Rs\.?\s*([0-9.]+)/i);
      if (match) {
        discount = parseFloat(match[1]) || 0;
      }
    }

    const finalAmount = parseFloat(payment.amount || 0);
    const subtotal = parseFloat(payment.subtotal || (finalAmount + discount));

    const invoiceNumber = payment.appointmentId || payment.id || `INV-${Date.now()}`;
    const invoiceDate = formatInvoiceDate(payment.createdAt || payment.date);
    const paymentMethod = payment.paymentMethod ? payment.paymentMethod.toUpperCase() : 'N/A';
    const paymentStatus = payment.status || 'pending';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('SERVICE CENTER INVOICE', 20, 25);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('Smart Service Center Navigator', 20, 35);
    doc.text('Currency: Sri Lankan Rupee (Rs.)', 20, 41);

    doc.setDrawColor(0, 61, 130);
    doc.setLineWidth(0.6);
    doc.line(20, 46, 190, 46);

    doc.setFont('helvetica', 'bold');
    doc.text('Invoice Details', 20, 56);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice No: ${invoiceNumber}`, 20, 64);
    doc.text(`Date: ${invoiceDate}`, 20, 71);
    doc.text(`Customer: ${payment.customerName || 'N/A'}`, 20, 78);

    doc.setFont('helvetica', 'bold');
    doc.text('Payment Summary', 20, 92);
    doc.setFont('helvetica', 'normal');
    
    doc.text(`Subtotal: Rs. ${subtotal.toFixed(2)}`, 20, 100);
    doc.text(`Loyalty Discount: - Rs. ${discount.toFixed(2)}`, 20, 107);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Final Total Paid: Rs. ${finalAmount.toFixed(2)}`, 20, 114);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Payment Method: ${paymentMethod}`, 20, 121);
    doc.text(`Status: ${paymentStatus.toUpperCase()}`, 20, 128);

    const description = payment.description || 'No additional notes provided.';
    const wrappedDescription = doc.splitTextToSize(description, 160);
    doc.setFont('helvetica', 'bold');
    doc.text('Description', 20, 142);
    doc.setFont('helvetica', 'normal');
    doc.text(wrappedDescription, 20, 150);

    doc.setDrawColor(220, 220, 220);
    doc.line(20, 262, 190, 262);
    doc.setFontSize(10);
    doc.text('Generated by Smart Service Center Navigator Admin Portal', 20, 270);

    const filename = `invoice-${String(invoiceNumber).replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
    doc.save(filename);
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2>💳 Payment Management</h2>
          <p className="muted">Process and track service payments</p>
        </div>
        {!isCreating && (
          <button onClick={() => setIsCreating(true)}>+ Record Payment</button>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <p className="muted small">Total Revenue</p>
          <strong className="stat-value">Rs. {stats.total.toFixed(2)}</strong>
        </div>
        <div className="stat-card">
          <p className="muted small">Today's Revenue</p>
          <strong className="stat-value">Rs. {stats.todayTotal.toFixed(2)}</strong>
          <p className="muted tiny">{stats.todayCount} transactions</p>
        </div>
        <div className="stat-card">
          <p className="muted small">Completed</p>
          <strong className="stat-value">{stats.completedCount}</strong>
        </div>
        <div className="stat-card">
          <p className="muted small">Pending</p>
          <strong className="stat-value">{stats.pendingCount}</strong>
        </div>
      </div>

      {isCreating && (
        <form className="service-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Select Customer
              <select name="customerId" value={form.customerId} onChange={handleCustomerSelect} required style={{ padding: '8px', width: '100%' }}>
                <option value="">-- Choose Customer --</option>
                {customers.map((c) => (
                  <option key={c.id || c._id} value={c.id || c._id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Customer Name
              <input name="customerName" value={form.customerName} readOnly placeholder="Auto-filled from selection" style={{ backgroundColor: '#f1f1f1' }} required />
            </label>

            <label>
              Appointment/Invoice ID
              <input name="appointmentId" value={form.appointmentId} onChange={handleChange} />
            </label>
          </div>

          <div className="form-grid">
            <label>
              Original Amount (Rs.)
              <input
                name="amount"
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Payment Method
              <select name="paymentMethod" value={form.paymentMethod} onChange={handleChange}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="online">Online</option>
                <option value="upi">UPI</option>
              </select>
            </label>
            <label>
              Status
              <select name="status" value={form.status} onChange={handleChange}>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </label>
          </div>

          {selectedCustomer && (
            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', margin: '15px 0', border: '1px solid #dee2e6' }}>
              <h4>🎁 Redeem Loyalty Points</h4>
              <p className="muted small">Available Points for {selectedCustomer.name}: <strong>{selectedCustomer.loyaltyPoints || 0}</strong></p>
              
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px' }}>
                <input
                  type="number"
                  min="0"
                  max={selectedCustomer.loyaltyPoints || 0}
                  value={pointsToRedeem}
                  onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                  placeholder="Points to redeem"
                  style={{ width: '150px', padding: '8px' }}
                />
                <button type="button" className="secondary" onClick={handleApplyLoyaltyDiscount}>
                  Apply Discount
                </button>
              </div>
              {loyaltyMessage && <p style={{ color: 'green', fontSize: '13px', marginTop: '5px' }}>{loyaltyMessage}</p>}
              {appliedDiscount > 0 && (
                <p style={{ color: '#003d82', fontWeight: 'bold', marginTop: '5px' }}>
                  Discount Deducted: - Rs. {appliedDiscount.toFixed(2)}
                </p>
              )}
            </div>
          )}

          <div style={{ fontSize: '16px', fontWeight: 'bold', margin: '10px 0', color: '#333' }}>
            Final Total to Pay: Rs. {finalPayableAmount.toFixed(2)}
          </div>

          <label>
            Description / Notes
            <textarea
              name="description"
              rows="2"
              value={form.description}
              onChange={handleChange}
              placeholder="Parts used, labor details, etc."
            />
          </label>
          <div className="form-actions">
            <button type="submit" disabled={loading}>
              Record Payment
            </button>
            <button type="button" className="ghost" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Invoice ID</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
              <th>Description</th>
              <th>Invoice</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && (
              <tr>
                <td colSpan={8} className="empty">
                  No payment records. Click "Record Payment" to add transactions.
                </td>
              </tr>
            )}
            {payments.map((payment) => {
              const status = getStatusBadge(payment.status);
              return (
                <tr key={payment.id || payment._id}>
                  <td className="muted small">
                    {payment.createdAt
                      ? new Date(payment.createdAt).toLocaleDateString()
                      : payment.date || '—'}
                  </td>
                  <td>
                    <strong>{payment.customerName}</strong>
                  </td>
                  <td className="muted">{payment.appointmentId || '—'}</td>
                  <td>
                    <strong>Rs. {parseFloat(payment.amount || 0).toFixed(2)}</strong>
                  </td>
                  <td>{getMethodBadge(payment.paymentMethod)}</td>
                  <td>
                    <span className={`status-badge ${status.className}`}>{status.label}</span>
                  </td>
                  <td className="muted small">{payment.description || '—'}</td>
                  <td>
                    <button
                      type="button"
                      className="secondary small"
                      onClick={() => handleDownloadInvoice(payment)}
                    >
                      Download PDF
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}