import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') ||
  (import.meta.env.DEV ? '/api' : 'http://127.0.0.1:5004/api');

const STANDARD_LABOR_TASKS = [
  { id: 'brake', name: 'Brake Pad Replacement & Cleaning Labor', defaultPrice: 1000 },
  { id: 'alignment', name: 'Wheel Alignment & Balancing Labor', defaultPrice: 1500 },
  { id: 'wiring', name: 'Wiring & Electrical Diagnosis Labor', defaultPrice: 2000 },
  { id: 'ac', name: 'A/C Gas Leak Check & Flush Labor', defaultPrice: 2500 },
  { id: 'tuneup', name: 'Engine Tune-up & Throttle Body Cleaning', defaultPrice: 2000 },
  { id: 'suspension', name: 'Suspension Bush / Shock Replacement Labor', defaultPrice: 3000 },
  { id: 'bulb', name: 'Headlight / Indicator Bulb Fitting Labor', defaultPrice: 500 },
  { id: 'dent', name: 'Dent & Body Panel Repair Labor', defaultPrice: 2500 },
  { id: 'ecu', name: 'ECU / Sensor Module Diagnosis & Repair', defaultPrice: 4500 },
  { id: 'exhaust', name: 'Exhaust & Muffler Repair Labor', defaultPrice: 1800 }
];

export default function PaymentManager({
  payments = [],
  customers = [],
  appointments = [],
  stocks = [],
  services = [],
  onCreate,
  onUpdate,
  onDelete,
  loading,
  token,
  userRole
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');

  // New Payment Form state
  const [form, setForm] = useState({
    customerId: '',
    customerName: '',
    appointmentId: '',
    serviceName: '',
    serviceCost: 0,
    laborItems: [],
    tax: 0,
    paymentMethod: 'cash',
    status: 'completed',
    description: '',
    parts: []
  });

  // Active Part selection inside form
  const [selectedStockId, setSelectedStockId] = useState('');
  const [partQuantity, setPartQuantity] = useState(1);
  const [customPartName, setCustomPartName] = useState('');
  const [customPartPrice, setCustomPartPrice] = useState('');

  const [selectedLaborId, setSelectedLaborId] = useState('');
  const [laborTaskPrice, setLaborTaskPrice] = useState('');
  const [customLaborTask, setCustomLaborTask] = useState('');

  // Loyalty discount state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [loyaltyMessage, setLoyaltyMessage] = useState('');

  const MAX_LOYALTY_POINTS = 10;

  // Handle appointment selection
  const handleAppointmentSelect = (e) => {
    const aptVal = e.target.value;
    if (!aptVal) {
      setForm((prev) => ({
        ...prev,
        appointmentId: '',
        customerName: '',
        customerId: '',
        serviceName: '',
        serviceCost: 0
      }));
      setSelectedCustomer(null);
      setAppliedDiscount(0);
      setLoyaltyMessage('');
      return;
    }

    const apt = appointments.find(
      (a) => (a.id || a._id) === aptVal || a.confirmationCode === aptVal
    );

    if (apt) {
      const cust = customers.find(
        (c) =>
          (c.id || c._id) === apt.customer ||
          c.name?.toLowerCase() === apt.customerName?.toLowerCase() ||
          (apt.customerPhone && c.phone === apt.customerPhone)
      );

      let basePrice = apt.estimatedCost || apt.actualCost || 0;
      if (!basePrice && apt.serviceName) {
        const srv = services.find(
          (s) => s.name?.toLowerCase() === apt.serviceName?.toLowerCase()
        );
        if (srv && srv.basePrice) basePrice = srv.basePrice;
      }

      setForm((prev) => ({
        ...prev,
        appointmentId: apt.confirmationCode || apt.id || apt._id,
        customerName: apt.customerName || prev.customerName,
        customerId: cust ? cust.id || cust._id : prev.customerId,
        serviceName: apt.serviceName || prev.serviceName,
        serviceCost: basePrice
      }));

      if (cust) setSelectedCustomer(cust);
      setAppliedDiscount(0);
      setLoyaltyMessage('');
    }
  };



  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  // Handle adding a spare part
  const handleAddPart = () => {
    if (selectedStockId === 'custom') {
      if (!customPartName.trim() || Number(customPartPrice) <= 0) {
        alert('Please enter a valid part name and price.');
        return;
      }
      const qty = Math.max(1, parseInt(partQuantity, 10) || 1);
      const unitP = parseFloat(customPartPrice) || 0;
      const newPart = {
        stockId: null,
        name: customPartName.trim(),
        quantity: qty,
        unitPrice: unitP,
        total: qty * unitP
      };
      setForm((prev) => ({ ...prev, parts: [...prev.parts, newPart] }));
      setCustomPartName('');
      setCustomPartPrice('');
      setSelectedStockId('');
      setPartQuantity(1);
      return;
    }

    if (!selectedStockId) {
      alert('Please select a spare part from the inventory.');
      return;
    }

    const stockItem = stocks.find((s) => (s.id || s._id) === selectedStockId);
    if (!stockItem) return;

    const qty = Math.max(1, parseInt(partQuantity, 10) || 1);
    if (stockItem.quantity !== undefined && qty > stockItem.quantity) {
      alert(`Warning: Only ${stockItem.quantity} units available in stock.`);
    }

    const unitP = parseFloat(stockItem.unitPrice || 0);
    const newPart = {
      stockId: stockItem.id || stockItem._id,
      name: stockItem.partName,
      quantity: qty,
      unitPrice: unitP,
      total: qty * unitP
    };

    setForm((prev) => ({ ...prev, parts: [...prev.parts, newPart] }));
    setSelectedStockId('');
    setPartQuantity(1);
  };

  const handleRemovePart = (indexToRemove) => {
    setForm((prev) => ({
      ...prev,
      parts: prev.parts.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // Handle labor dropdown selection
  const handleLaborSelectChange = (e) => {
    const val = e.target.value;
    setSelectedLaborId(val);
    if (val === 'custom') {
      setLaborTaskPrice('');
      setCustomLaborTask('');
      return;
    }
    const task = STANDARD_LABOR_TASKS.find((t) => t.id === val);
    if (task) setLaborTaskPrice(task.defaultPrice);
    else setLaborTaskPrice('');
  };

  const handleAddLaborTask = () => {
    if (selectedLaborId === 'custom') {
      if (!customLaborTask.trim()) {
        alert('Please enter a description for the custom labor task.');
        return;
      }
      const cost = parseFloat(laborTaskPrice) || 0;
      if (cost <= 0) {
        alert('Please enter a valid labor fee.');
        return;
      }
      setForm((prev) => ({
        ...prev,
        laborItems: [...prev.laborItems, { taskName: customLaborTask.trim(), cost }]
      }));
      setSelectedLaborId('');
      setCustomLaborTask('');
      setLaborTaskPrice('');
      return;
    }

    if (!selectedLaborId) {
      alert('Please choose a labor task from the list or select Custom.');
      return;
    }
    const task = STANDARD_LABOR_TASKS.find((t) => t.id === selectedLaborId);
    if (!task) return;
    const cost = parseFloat(laborTaskPrice) || task.defaultPrice;

    setForm((prev) => ({
      ...prev,
      laborItems: [...prev.laborItems, { taskName: task.name, cost }]
    }));

    setSelectedLaborId('');
    setLaborTaskPrice('');
  };

  const handleRemoveLaborTask = (indexToRemove) => {
    setForm((prev) => ({
      ...prev,
      laborItems: prev.laborItems.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // Calculations
  const partsSubtotal = useMemo(() => {
    return form.parts.reduce((sum, p) => sum + Number(p.total || 0), 0);
  }, [form.parts]);

  const totalLaborCost = useMemo(() => {
    return form.laborItems.reduce((sum, item) => sum + Number(item.cost || 0), 0);
  }, [form.laborItems]);

  const rawSubtotal = useMemo(() => {
    return (
      Number(form.serviceCost || 0) +
      partsSubtotal +
      totalLaborCost +
      Number(form.tax || 0)
    );
  }, [form.serviceCost, partsSubtotal, totalLaborCost, form.tax]);

  const finalPayableAmount = Math.max(0, rawSubtotal - appliedDiscount);

  // Loyalty Discount Application
  const handleApplyLoyaltyDiscount = async () => {
    if (!form.customerId) {
      alert('Please select a customer first.');
      return;
    }

    const currentPoints = Math.max(0, Number(selectedCustomer?.loyaltyPoints || 0));
    const earnedFromBill = Math.floor(rawSubtotal / 1000);
    const totalPoints = currentPoints + earnedFromBill;

    if (totalPoints < MAX_LOYALTY_POINTS) {
      alert(
        `Customer has ${currentPoints} stored + ${earnedFromBill} earned from this bill = ${totalPoints} points. Need ${MAX_LOYALTY_POINTS} points to unlock Rs. 500 discount.`
      );
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/customers/loyalty/use`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          customerId: form.customerId,
          points: MAX_LOYALTY_POINTS,
          pendingEarnedPoints: Math.floor(rawSubtotal / 1000),
          note: `Redeemed ${MAX_LOYALTY_POINTS} points for payment discount`
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to redeem loyalty points.');
      }

      const discount = data.discountAmount || MAX_LOYALTY_POINTS * 50;
      setAppliedDiscount(discount);
      setLoyaltyMessage(`Success! Loyalty discount of Rs. ${discount.toFixed(2)} applied.`);

      if (data.loyaltyPoints !== undefined) {
        setSelectedCustomer((prev) => ({
          ...prev,
          loyaltyPoints: data.loyaltyPoints
        }));
      }
    } catch (error) {
      alert(error.message || 'Failed to redeem loyalty points.');
    }
  };

  // Submit new payment
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.customerName.trim()) {
      alert('Customer Name is required.');
      return;
    }

    const finalData = {
      customerId: form.customerId || null,
      customerName: form.customerName.trim(),
      appointmentId: form.appointmentId.trim(),
      serviceName: form.serviceName.trim(),
      serviceCost: Number(form.serviceCost || 0),
      laborCost: totalLaborCost,
      laborItems: form.laborItems,
      tax: Number(form.tax || 0),
      items: form.parts,
      subtotal: rawSubtotal,
      discount: appliedDiscount,
      amount: finalPayableAmount,
      paymentMethod: form.paymentMethod,
      status: form.status,
      description:
        appliedDiscount > 0
          ? `${form.description || ''} (Loyalty Discount: Rs. ${appliedDiscount})`.trim()
          : form.description
    };

    onCreate(finalData, () => {
      resetForm();
    });
  };

  const resetForm = () => {
    setForm({
      customerId: '',
      customerName: '',
      appointmentId: '',
      serviceName: '',
      serviceCost: 0,
      laborItems: [],
      tax: 0,
      paymentMethod: 'cash',
      status: 'completed',
      description: '',
      parts: []
    });
    setSelectedCustomer(null);
    setAppliedDiscount(0);
    setLoyaltyMessage('');
    setSelectedStockId('');
    setPartQuantity(1);
    setCustomPartName('');
    setCustomPartPrice('');
    setSelectedLaborId('');
    setLaborTaskPrice('');
    setCustomLaborTask('');
    setIsCreating(false);
  };

  // Edit payment modal submit
  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingPayment) return;
    const id = editingPayment.id || editingPayment._id;
    onUpdate(
      id,
      {
        status: editingPayment.status,
        paymentMethod: editingPayment.paymentMethod,
        description: editingPayment.description
      },
      () => {
        setEditingPayment(null);
      }
    );
  };

  // Statistics calculation
  const stats = useMemo(() => {
    const total = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const completedList = payments.filter((p) => p.status === 'completed');
    const pendingCount = payments.filter((p) => p.status === 'pending').length;
    const todayPayments = payments.filter((p) => {
      const paymentDate = new Date(p.createdAt || p.date);
      const today = new Date();
      return paymentDate.toDateString() === today.toDateString();
    });
    const todayTotal = todayPayments.reduce(
      (sum, p) => sum + parseFloat(p.amount || 0),
      0
    );

    return {
      total,
      completedCount: completedList.length,
      pendingCount,
      todayTotal,
      todayCount: todayPayments.length
    };
  }, [payments]);

  // Filtered Payments list
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchSearch =
        !searchTerm ||
        p.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.invoiceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.appointmentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.serviceName?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchMethod = methodFilter === 'all' || p.paymentMethod === methodFilter;

      return matchSearch && matchStatus && matchMethod;
    });
  }, [payments, searchTerm, statusFilter, methodFilter]);

  const getStatusBadge = (status) => {
    const badges = {
      completed: { label: 'Paid', className: 'status-success' },
      pending: { label: 'Pending', className: 'status-warning' },
      failed: { label: 'Failed', className: 'status-danger' },
      refunded: { label: 'Refunded', className: 'status-muted' }
    };
    return badges[status] || { label: status || 'Pending', className: '' };
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

  // Itemized PDF Generator (with warm amber header matching project theme)
  const handleDownloadInvoice = (payment) => {
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
    doc.text(`Subtotal:`, 130, yPos);
    doc.text(`Rs. ${subtotal.toFixed(2)}`, 170, yPos);
    yPos += 6;

    if (discount > 0) {
      doc.setTextColor(231, 76, 60);
      doc.text(`Loyalty Discount:`, 130, yPos);
      doc.text(`- Rs. ${discount.toFixed(2)}`, 170, yPos);
      yPos += 6;
      doc.setTextColor(50, 50, 50);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Grand Total Paid:`, 130, yPos + 2);
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

    const filename = `invoice-${String(invoiceNumber).replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
    doc.save(filename);
  };

  return (
    <div className="card">
      <div
        className="card-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div>
          <h2>💳 Payment & Invoice Management</h2>
          <p className="muted">
            Process service bills, spare parts, itemized labor tasks, and print official receipts
          </p>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            style={{
              background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
              color: '#fff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 2px 5px rgba(243, 156, 18, 0.35)'
            }}
          >
            + Record New Payment
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div
        className="stats-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          margin: '20px 0'
        }}
      >
        <div
          className="stat-card"
          style={{
            background: '#f8f9fa',
            padding: '15px',
            borderRadius: '8px',
            borderLeft: '4px solid #f39c12'
          }}
        >
          <p className="muted small" style={{ margin: 0 }}>Total Revenue</p>
          <strong className="stat-value" style={{ fontSize: '1.4rem', color: '#d35400' }}>
            Rs. {stats.total.toFixed(2)}
          </strong>
        </div>
        <div
          className="stat-card"
          style={{
            background: '#f8f9fa',
            padding: '15px',
            borderRadius: '8px',
            borderLeft: '4px solid #28a745'
          }}
        >
          <p className="muted small" style={{ margin: 0 }}>Today's Revenue</p>
          <strong className="stat-value" style={{ fontSize: '1.4rem', color: '#28a745' }}>
            Rs. {stats.todayTotal.toFixed(2)}
          </strong>
          <p className="muted tiny" style={{ margin: '4px 0 0 0', fontSize: '11px' }}>
            {stats.todayCount} transactions
          </p>
        </div>
        <div
          className="stat-card"
          style={{
            background: '#f8f9fa',
            padding: '15px',
            borderRadius: '8px',
            borderLeft: '4px solid #17a2b8'
          }}
        >
          <p className="muted small" style={{ margin: 0 }}>Completed (Paid)</p>
          <strong className="stat-value" style={{ fontSize: '1.4rem', color: '#17a2b8' }}>
            {stats.completedCount}
          </strong>
        </div>
        <div
          className="stat-card"
          style={{
            background: '#f8f9fa',
            padding: '15px',
            borderRadius: '8px',
            borderLeft: '4px solid #ffc107'
          }}
        >
          <p className="muted small" style={{ margin: 0 }}>Pending Payments</p>
          <strong className="stat-value" style={{ fontSize: '1.4rem', color: '#e67e22' }}>
            {stats.pendingCount}
          </strong>
        </div>
      </div>

      {/* Create Payment Modal / Form */}
      {isCreating && (
        <form
          className="service-form"
          onSubmit={handleSubmit}
          style={{
            background: '#ffffff',
            border: '2px solid #f39c12',
            borderRadius: '10px',
            padding: '24px',
            margin: '25px 0',
            boxShadow: '0 4px 12px rgba(243, 156, 18, 0.15)'
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', color: '#d35400' }}>📝 New Billing & Checkout</h3>

          {/* Appointment Selector */}
          {/* Appointment Selector */}
          <div
            style={{
              background: '#fef9f2',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              border: '1px solid #fdebd0'
            }}
          >
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px', color: '#d35400' }}>
              Select Appointment (Auto-fills details):
            </label>
            <select
              value={form.appointmentId}
              onChange={handleAppointmentSelect}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #f5b041' }}
            >
              <option value="">-- Choose Appointment --</option>
              {appointments
                .filter((a) => a.status === 'completed')
                .map((a) => (
                  <option key={a.id || a._id} value={a.confirmationCode || a.id || a._id}>
                    [{a.confirmationCode || 'APT'}] {a.customerName} ({a.status})
                  </option>
                ))}
            </select>
          </div>

          {/* Conditional: If Appointment is selected, show a single clean Customer & Booking Badge */}
          {form.appointmentId && (
            <div
              style={{
                background: '#fffdf9',
                border: '1px solid #f5b041',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: '#7f8c8d', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Contact
                </span>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#2c3e50', marginTop: '2px' }}>
                  📞 {selectedCustomer?.phone || form.customerName}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: '#7f8c8d', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Appointment Ref
                </span>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#d35400', marginTop: '2px' }}>
                  🔖 {form.appointmentId}
                </div>
              </div>
            </div>
          )}

          <div
            className="form-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
              marginTop: '14px'
            }}
          >
            <label>
              Service Package Name
              <input
                name="serviceName"
                value={form.serviceName}
                onChange={handleChange}
                placeholder="e.g. Full Lubrication Service"
                style={{ width: '100%', padding: '8px' }}
              />
            </label>

            <label>
              Base Service Cost (Rs.)
              <input
                name="serviceCost"
                type="number"
                min="0"
                step="0.01"
                value={form.serviceCost}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px' }}
              />
            </label>
          </div>

          {/* Spare Parts Section */}
          <div
            style={{
              background: '#fcfcfc',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '16px',
              margin: '20px 0'
            }}
          >
            <h4
              style={{
                margin: '0 0 12px 0',
                color: '#2c3e50',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              📦 Replaced Spare Parts (Auto-deducts from Stock)
            </h4>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                alignItems: 'flex-end',
                marginBottom: '14px'
              }}
            >
              <div style={{ flex: '2', minWidth: '220px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Choose Inventory Part:</label>
                <select
                  value={selectedStockId}
                  onChange={(e) => setSelectedStockId(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px' }}
                >
                  <option value="">-- Choose Stock Item --</option>
                  {stocks.map((s) => (
                    <option key={s.id || s._id} value={s.id || s._id}>
                      {s.partName} — Rs. {parseFloat(s.unitPrice || 0).toFixed(2)} (Available: {s.quantity})
                    </option>
                  ))}
                  <option value="custom">+ Custom / External Part</option>
                </select>
              </div>

              {selectedStockId === 'custom' && (
                <>
                  <div style={{ flex: '2', minWidth: '160px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Custom Part Name:</label>
                    <input
                      type="text"
                      placeholder="e.g. Wiper Blade"
                      value={customPartName}
                      onChange={(e) => setCustomPartName(e.target.value)}
                      style={{ width: '100%', padding: '8px' }}
                    />
                  </div>
                  <div style={{ flex: '1', minWidth: '100px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Unit Price (Rs.):</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={customPartPrice}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setCustomPartPrice(e.target.value)}
                      style={{ width: '100%', padding: '8px' }}
                    />
                  </div>
                </>
              )}

              <div style={{ width: '90px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Quantity:</label>
                <input
                  type="number"
                  min="1"
                  value={partQuantity}
                  onChange={(e) =>
                    setPartQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))
                  }
                  style={{ width: '100%', padding: '8px' }}
                />
              </div>

              <button
                type="button"
                onClick={handleAddPart}
                style={{
                  background: '#28a745',
                  color: '#fff',
                  border: 'none',
                  padding: '9px 18px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                + Add Part
              </button>
            </div>

            {/* Added Parts Table */}
            {form.parts.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                <thead>
                  <tr style={{ background: '#fef5e7', fontSize: '12px', textAlign: 'left', color: '#d35400' }}>
                    <th style={{ padding: '8px' }}>Part Name</th>
                    <th style={{ padding: '8px' }}>Qty</th>
                    <th style={{ padding: '8px' }}>Unit Price</th>
                    <th style={{ padding: '8px' }}>Total (Rs.)</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {form.parts.map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee', fontSize: '13px' }}>
                      <td style={{ padding: '8px', fontWeight: '500' }}>{p.name}</td>
                      <td style={{ padding: '8px' }}>{p.quantity}</td>
                      <td style={{ padding: '8px' }}>Rs. {p.unitPrice.toFixed(2)}</td>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>
                        Rs. {p.total.toFixed(2)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRemovePart(idx)}
                          style={{
                            background: '#e74c3c',
                            color: '#fff',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px'
                          }}
                        >
                          ✕ Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: '#fafafa', fontWeight: 'bold' }}>
                    <td colSpan="3" style={{ padding: '8px', textAlign: 'right' }}>
                      Parts Subtotal:
                    </td>
                    <td colSpan="2" style={{ padding: '8px', color: '#d35400' }}>
                      Rs. {partsSubtotal.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="muted small" style={{ margin: '8px 0', fontStyle: 'italic' }}>
                No spare parts added to this bill yet.
              </p>
            )}
          </div>

          {/* Itemized Additional Labor Section */}
          <div
            style={{
              background: '#fcfcfc',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '16px',
              margin: '20px 0'
            }}
          >
            <h4
              style={{
                margin: '0 0 12px 0',
                color: '#2c3e50',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              👨‍🔧 Additional Labor & Extra Repairs (Itemized Tasks)
            </h4>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                alignItems: 'flex-end',
                marginBottom: '14px'
              }}
            >
              <div style={{ flex: '2', minWidth: '240px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>
                  Select Labor Task / Extra Repair:
                </label>
                <select
                  value={selectedLaborId}
                  onChange={handleLaborSelectChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px' }}
                >
                  <option value="">-- Choose Standard Labor Work --</option>
                  {STANDARD_LABOR_TASKS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                  <option value="custom">+ Custom / Other Labor Task</option>
                </select>
              </div>

              {selectedLaborId === 'custom' && (
                <div style={{ flex: '2', minWidth: '220px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>
                    Custom Task Description:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Side mirror repair / Latch greasing"
                    value={customLaborTask}
                    onChange={(e) => setCustomLaborTask(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px' }}
                  />
                </div>
              )}


              <div style={{ width: '130px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Labor Fee (Rs.):</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  placeholder="0"
                  value={laborTaskPrice}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setLaborTaskPrice(e.target.value)}
                  style={{ width: '100%', padding: '8px' }}
                />
              </div>

              <button
                type="button"
                onClick={handleAddLaborTask}
                style={{
                  background: '#f39c12',
                  color: '#fff',
                  border: 'none',
                  padding: '9px 18px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                + Add Labor Task
              </button>
            </div>

            {/* Added Labor Tasks Table */}
            {form.laborItems.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                <thead>
                  <tr style={{ background: '#fef5e7', fontSize: '12px', textAlign: 'left', color: '#d35400' }}>
                    <th style={{ padding: '8px' }}>Task / Repair Description</th>
                    <th style={{ padding: '8px' }}>Labor Charge (Rs.)</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {form.laborItems.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee', fontSize: '13px' }}>
                      <td style={{ padding: '8px', fontWeight: '500' }}>🔧 {item.taskName}</td>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>
                        Rs. {parseFloat(item.cost || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveLaborTask(idx)}
                          style={{
                            background: '#e74c3c',
                            color: '#fff',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px'
                          }}
                        >
                          ✕ Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: '#fafafa', fontWeight: 'bold' }}>
                    <td style={{ padding: '8px', textAlign: 'right' }}>Total Labor Charges:</td>
                    <td colSpan="2" style={{ padding: '8px', color: '#d35400' }}>
                      Rs. {totalLaborCost.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="muted small" style={{ margin: '8px 0', fontStyle: 'italic' }}>
                No extra labor tasks added to this bill.
              </p>
            )}
          </div>

          {/* Loyalty Points Section */}
          {selectedCustomer && (() => {
            const isDiscountApplied = appliedDiscount > 0;
            const currentPoints = Math.max(0, Number(selectedCustomer.loyaltyPoints || 0));
            // When discount is already applied, pending bill points were already absorbed into the redemption
            const earnedFromBill = isDiscountApplied ? 0 : Math.floor(rawSubtotal / 1000);
            const totalPoints = isDiscountApplied ? currentPoints : (currentPoints + earnedFromBill);
            const hasMaxPoints = !isDiscountApplied && totalPoints >= MAX_LOYALTY_POINTS;
            return (
              <div
                style={{
                  background: isDiscountApplied ? '#f0fdf4' : '#fdfefe',
                  padding: '15px',
                  borderRadius: '8px',
                  margin: '15px 0',
                  border: `1px solid ${isDiscountApplied ? '#22c55e' : hasMaxPoints ? '#28a745' : '#f5b041'}`
                }}
              >
                <h4 style={{ margin: '0 0 6px 0', color: isDiscountApplied ? '#166534' : '#d35400' }}>
                  🎁 Customer Loyalty Points
                </h4>

                {isDiscountApplied ? (
                  <>
                    <p className="muted small" style={{ margin: 0, color: '#166534' }}>
                      Remaining points: <strong>{currentPoints}</strong>
                      <span style={{ marginLeft: '6px', color: '#666', fontSize: '12px' }}>
                        (10 points redeemed for this bill)
                      </span>
                    </p>
                    <p style={{ color: '#15803d', fontWeight: 'bold', fontSize: '13px', marginTop: '6px' }}>
                      🎉 Loyalty Discount Applied: - Rs. {appliedDiscount.toFixed(2)}
                    </p>
                    {currentPoints >= MAX_LOYALTY_POINTS ? (
                      <p style={{ color: '#27ae60', fontSize: '12px', marginTop: '4px', margin: 0, fontWeight: '500' }}>
                        ✨ Customer still has <strong>{currentPoints} points</strong> available for future bills!
                      </p>
                    ) : (
                      <p style={{ color: '#666', fontSize: '12px', marginTop: '4px', margin: 0 }}>
                        ⏳ {Math.max(0, MAX_LOYALTY_POINTS - currentPoints)} more points needed for the next Rs. 500 discount.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="muted small" style={{ margin: 0 }}>
                      Stored points: <strong>{currentPoints}</strong>
                      {earnedFromBill > 0 && (
                        <span style={{ color: '#28a745', marginLeft: '6px' }}>
                          + {earnedFromBill} earned from this bill
                        </span>
                      )}
                      {' '} = <strong>{totalPoints}</strong> / {MAX_LOYALTY_POINTS}
                    </p>

                    {!hasMaxPoints ? (
                      <p style={{ color: '#888', fontSize: '13px', marginTop: '6px' }}>
                        ⏳ {Math.max(0, MAX_LOYALTY_POINTS - totalPoints)} more points needed to unlock Rs. 500 discount.
                      </p>
                    ) : (
                      <>
                        <p
                          style={{
                            color: '#28a745',
                            fontSize: '13px',
                            marginTop: '6px',
                            fontWeight: 'bold'
                          }}
                        >
                          🎉 10 points reached! Eligible for Rs. 500 discount on this bill.
                        </p>
                        <button
                          type="button"
                          style={{
                            background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            marginTop: '6px'
                          }}
                          onClick={handleApplyLoyaltyDiscount}
                        >
                          Apply Loyalty Discount (Redeem 10 Points)
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })()}

          {/* Payment Method & Status */}
          <div
            className="form-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              margin: '16px 0'
            }}
          >
            <label>
              Payment Method
              <select
                name="paymentMethod"
                value={form.paymentMethod}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px' }}
              >
                <option value="cash">💵 Cash</option>
                <option value="card">💳 Card</option>
                <option value="online">🌐 Online Transfer</option>
                <option value="upi">📱 UPI / QR</option>
              </select>
            </label>

            <label>
              Payment Status
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px' }}
              >
                <option value="completed">Completed (Paid)</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </label>
          </div>

          {/* Total Breakdown Box */}
          <div
            style={{
              background: '#fef9f2',
              border: '1px solid #fdebd0',
              borderRadius: '8px',
              padding: '16px',
              margin: '20px 0'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '6px',
                fontSize: '14px'
              }}
            >
              <span>Base Service Package:</span>
              <strong>Rs. {Number(form.serviceCost || 0).toFixed(2)}</strong>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '6px',
                fontSize: '14px'
              }}
            >
              <span>Spare Parts ({form.parts.length} items):</span>
              <strong>Rs. {partsSubtotal.toFixed(2)}</strong>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '6px',
                fontSize: '14px'
              }}
            >
              <span>Additional Labor Tasks ({form.laborItems.length} items):</span>
              <strong>Rs. {totalLaborCost.toFixed(2)}</strong>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '6px',
                fontSize: '14px'
              }}
            >
              <span>Subtotal:</span>
              <strong>Rs. {rawSubtotal.toFixed(2)}</strong>
            </div>
            {appliedDiscount > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                  fontSize: '14px',
                  color: '#e74c3c'
                }}
              >
                <span>Loyalty Discount:</span>
                <strong>- Rs. {appliedDiscount.toFixed(2)}</strong>
              </div>
            )}
            <hr style={{ border: 'none', borderTop: '1px solid #f5b041', margin: '10px 0' }} />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#d35400'
              }}
            >
              <span>Net Total Payable:</span>
              <span>Rs. {finalPayableAmount.toFixed(2)}</span>
            </div>
          </div>

          <label style={{ display: 'block', marginBottom: '16px' }}>
            Description / Notes
            <textarea
              name="description"
              rows="2"
              value={form.description}
              onChange={handleChange}
              placeholder="e.g. Engine oil replaced, brake pad skimmed and aligned."
              style={{ width: '100%', padding: '8px', marginTop: '4px' }}
            />
          </label>

          <div className="form-actions" style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
                color: '#fff',
                border: 'none',
                padding: '11px 26px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '15px',
                boxShadow: '0 3px 6px rgba(243, 156, 18, 0.4)'
              }}
            >
              {loading ? 'Processing...' : '✔ Confirm & Record Payment'}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={resetForm}
              style={{
                background: '#f8f9fa',
                border: '1px solid #ccc',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Edit Payment Modal */}
      {editingPayment && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <form
            onSubmit={handleEditSubmit}
            style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '8px',
              width: '90%',
              maxWidth: '450px'
            }}
          >
            <h3 style={{ marginTop: 0, color: '#d35400' }}>✏️ Edit Payment Record</h3>
            <p className="muted small">
              Customer: <strong>{editingPayment.customerName}</strong> (Invoice:{' '}
              {editingPayment.invoiceId || editingPayment.id})
            </p>

            <label style={{ display: 'block', margin: '12px 0 6px 0' }}>Status</label>
            <select
              value={editingPayment.status}
              onChange={(e) =>
                setEditingPayment((prev) => ({ ...prev, status: e.target.value }))
              }
              style={{ width: '100%', padding: '8px' }}
            >
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>

            <label style={{ display: 'block', margin: '12px 0 6px 0' }}>Payment Method</label>
            <select
              value={editingPayment.paymentMethod}
              onChange={(e) =>
                setEditingPayment((prev) => ({ ...prev, paymentMethod: e.target.value }))
              }
              style={{ width: '100%', padding: '8px' }}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="online">Online</option>
              <option value="upi">UPI</option>
            </select>

            <label style={{ display: 'block', margin: '12px 0 6px 0' }}>Notes / Description</label>
            <textarea
              rows="3"
              value={editingPayment.description || ''}
              onChange={(e) =>
                setEditingPayment((prev) => ({ ...prev, description: e.target.value }))
              }
              style={{ width: '100%', padding: '8px' }}
            />

            <div
              style={{
                display: 'flex',
                gap: '10px',
                marginTop: '16px',
                justifyContent: 'flex-end'
              }}
            >
              <button
                type="button"
                onClick={() => setEditingPayment(null)}
                style={{ padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          margin: '20px 0 15px 0',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', gap: '10px', flex: '1', minWidth: '280px' }}>
          <input
            type="text"
            placeholder="🔍 Search by Customer, Invoice No, Appointment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #ccc'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
          >
            <option value="all">All Statuses</option>
            <option value="completed">Paid / Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
          >
            <option value="all">All Methods</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="online">Online</option>
            <option value="upi">UPI</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="table-wrapper">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr
              style={{
                background: '#fef5e7',
                textAlign: 'left',
                borderBottom: '2px solid #f5b041',
                color: '#d35400'
              }}
            >
              <th style={{ padding: '10px' }}>DATE</th>
              <th style={{ padding: '10px' }}>CUSTOMER</th>
              <th style={{ padding: '10px' }}>INVOICE REF</th>
              <th style={{ padding: '10px' }}>SERVICE / PARTS / LABOR</th>
              <th style={{ padding: '10px' }}>AMOUNT</th>
              <th style={{ padding: '10px' }}>METHOD</th>
              <th style={{ padding: '10px' }}>STATUS</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: '#7f8c8d' }}>
                  No payment records found matching your filters.
                </td>
              </tr>
            ) : (
              filteredPayments.map((payment) => {
                const status = getStatusBadge(payment.status);
                const partsCount = payment.items?.length || 0;
                const laborCount = payment.laborItems?.length || 0;
                return (
                  <tr key={payment.id || payment._id} style={{ borderBottom: '1px solid #eee' }}>
                    <td className="muted small" style={{ padding: '10px' }}>
                      {payment.createdAt
                        ? new Date(payment.createdAt).toLocaleDateString()
                        : payment.date || '—'}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <strong>{payment.customerName}</strong>
                    </td>
                    <td className="muted" style={{ padding: '10px' }}>
                      {payment.invoiceId || payment.appointmentId || '—'}
                    </td>
                    <td style={{ padding: '10px', fontSize: '13px' }}>
                      <div>{payment.serviceName || 'Automotive Service'}</div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '3px' }}>
                        {partsCount > 0 && (
                          <span style={{ color: '#28a745', fontSize: '11px', fontWeight: 'bold' }}>
                            📦 {partsCount} part{partsCount > 1 ? 's' : ''}
                          </span>
                        )}
                        {laborCount > 0 && (
                          <span style={{ color: '#e67e22', fontSize: '11px', fontWeight: 'bold' }}>
                            👨‍🔧 {laborCount} extra task{laborCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <strong style={{ color: '#d35400' }}>
                        Rs. {parseFloat(payment.amount || 0).toFixed(2)}
                      </strong>
                    </td>
                    <td style={{ padding: '10px' }}>{getMethodBadge(payment.paymentMethod)}</td>
                    <td style={{ padding: '10px' }}>
                      <span className={`status-badge ${status.className}`}>{status.label}</span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="secondary small"
                          onClick={() => handleDownloadInvoice(payment)}
                          title="Download Itemized PDF"
                          style={{
                            background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
                            color: '#fff',
                            border: 'none',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                        >
                          📄 PDF
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingPayment(payment)}
                          title="Edit Payment"
                          style={{
                            background: '#e9ecef',
                            border: '1px solid #ced4da',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          ✏️
                        </button>

                        {onDelete && (userRole === 'admin' || userRole === 'manager') && (
                          <button
                            type="button"
                            onClick={() => onDelete(payment.id || payment._id)}
                            title="Delete Payment"
                            style={{
                              background: '#ffebee',
                              border: '1px solid #ffcdd2',
                              color: '#c62828',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}