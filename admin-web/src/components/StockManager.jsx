import React, { useState, useEffect, useRef } from 'react';

export default function StockManager({ stocks, onCreate, onUpdate, onDelete, loading }) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const shownRef = useRef(false);

  const [form, setForm] = useState({
    partName: '',
    partNumber: '',
    quantity: 0,
    minQuantity: 10,
    unitPrice: 0,
    supplier: ''
  });

  // ─── Compute low-stock lists ───────────────────────────────────────────────
  const lowStockItems = stocks.filter((s) => s.quantity <= s.minQuantity);
  const outOfStockItems = stocks.filter((s) => s.quantity === 0);
  const hasOutOfStock = outOfStockItems.length > 0;

  // ─── Show toast notifications once when stocks load ────────────────────────
  useEffect(() => {
    if (stocks.length === 0 || shownRef.current) return;
    if (lowStockItems.length === 0) return;
    shownRef.current = true;

    const newToasts = [];

    if (outOfStockItems.length > 0) {
      newToasts.push({
        id: Date.now(),
        type: 'critical',
        title: 'Out of Stock!',
        message: outOfStockItems.map((s) => s.partName).join(', '),
        icon: '🚨',
        duration: 8000,
      });
    }

    const lowOnly = lowStockItems.filter((s) => s.quantity > 0);
    if (lowOnly.length > 0) {
      newToasts.push({
        id: Date.now() + 1,
        type: 'warning',
        title: 'Low Stock Warning',
        message: `${lowOnly.length} part(s) running low: ${lowOnly.map((s) => s.partName).join(', ')}`,
        icon: '⚠️',
        duration: 6000,
      });
    }

    setToasts(newToasts);
  }, [stocks]);

  // ─── Auto-dismiss toasts ───────────────────────────────────────────────────
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) =>
      setTimeout(() => dismissToast(t.id), t.duration)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  // ─── Close notification panel on outside click ────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const dismissToast = (id) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  const triggerToasts = () => {
    shownRef.current = false;
    setToasts([]);
    setTimeout(() => {
      shownRef.current = false;
    }, 50);
    // re-trigger via useEffect by temporarily clearing shownRef
    const newToasts = [];
    if (outOfStockItems.length > 0) {
      newToasts.push({
        id: Date.now(),
        type: 'critical',
        title: 'Out of Stock!',
        message: outOfStockItems.map((s) => s.partName).join(', '),
        icon: '🚨',
        duration: 8000,
      });
    }
    const lowOnly = lowStockItems.filter((s) => s.quantity > 0);
    if (lowOnly.length > 0) {
      newToasts.push({
        id: Date.now() + 1,
        type: 'warning',
        title: 'Low Stock Warning',
        message: `${lowOnly.length} part(s) running low: ${lowOnly.map((s) => s.partName).join(', ')}`,
        icon: '⚠️',
        duration: 6000,
      });
    }
    setToasts(newToasts);
    setNotifOpen(false);
  };

  // ─── Form handlers ─────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingId) {
      onUpdate(editingId, form, () => {
        setEditingId(null);
        setForm({ partName: '', partNumber: '', quantity: 0, minQuantity: 10, unitPrice: 0, supplier: '' });
      });
    } else {
      onCreate(form, () => {
        setForm({ partName: '', partNumber: '', quantity: 0, minQuantity: 10, unitPrice: 0, supplier: '' });
        setIsCreating(false);
      });
    }
  };

  const handleEdit = (stock) => {
    setEditingId(stock.id);
    setForm({
      partName: stock.partName,
      partNumber: stock.partNumber,
      quantity: stock.quantity,
      minQuantity: stock.minQuantity,
      unitPrice: stock.unitPrice,
      supplier: stock.supplier,
    });
    setIsCreating(true);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setForm({ partName: '', partNumber: '', quantity: 0, minQuantity: 10, unitPrice: 0, supplier: '' });
  };

  const getStockStatus = (stock) => {
    if (stock.quantity === 0) return { label: 'Out of Stock', className: 'status-danger' };
    if (stock.quantity <= stock.minQuantity) return { label: 'Low Stock', className: 'status-warning' };
    return { label: 'In Stock', className: 'status-success' };
  };

  return (
    <>
      {/* ── Toast Notification Stack ── */}
      <div className="toast-stack">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span className="toast-icon">{toast.icon}</span>
            <div className="toast-body">
              <p className="toast-title">{toast.title}</p>
              <p className="toast-msg">{toast.message}</p>
            </div>
            <button className="toast-close" onClick={() => dismissToast(toast.id)}>✕</button>
            <div className="toast-progress" style={{ animationDuration: `${toast.duration}ms` }} />
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2>📦 Spare Parts Inventory</h2>
            <p className="muted">
              Track stock levels and suppliers
              {lowStockItems.length > 0 && (
                <span style={{ color: hasOutOfStock ? '#dc2626' : '#d97706', fontWeight: 700, marginLeft: '0.5rem' }}>
                  • {hasOutOfStock ? '🚨' : '⚠️'} {lowStockItems.length} alert{lowStockItems.length > 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Bell notification button */}
            {lowStockItems.length > 0 && (
              <div className="notif-wrapper" ref={notifRef}>
                <button
                  className="notif-bell"
                  onClick={() => setNotifOpen((v) => !v)}
                  title="View stock alerts"
                >
                  🔔
                  <span className={`notif-badge ${hasOutOfStock ? 'badge-critical' : 'badge-warn'}`}>
                    {lowStockItems.length}
                  </span>
                </button>

                {notifOpen && (
                  <div className="notif-panel">
                    <div className="notif-header">
                      <span>📋 Stock Alerts</span>
                      <button className="notif-show-btn" onClick={triggerToasts}>
                        Show Notifications
                      </button>
                    </div>
                    <div className="notif-list">
                      {lowStockItems.map((stock) => (
                        <div key={stock.id} className={`notif-item ${stock.quantity === 0 ? 'notif-critical' : 'notif-warn'}`}>
                          <span>{stock.quantity === 0 ? '🔴' : '🟠'}</span>
                          <div>
                            <strong>{stock.partName}</strong>
                            <p>{stock.quantity === 0 ? 'Out of stock' : `Only ${stock.quantity} left (min: ${stock.minQuantity})`}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isCreating && (
              <button onClick={() => setIsCreating(true)}>+ Add Part</button>
            )}
          </div>
        </div>

        {isCreating && (
          <form className="service-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label>
                Part Name
                <input name="partName" value={form.partName} onChange={handleChange} required />
              </label>
              <label>
                Part Number
                <input name="partNumber" value={form.partNumber} onChange={handleChange} required />
              </label>
            </div>
            <div className="form-grid">
              <label>
                Quantity
                <input name="quantity" type="number" min="0" value={form.quantity} onChange={handleChange} required />
              </label>
              <label>
                Min. Quantity (Alert Threshold)
                <input name="minQuantity" type="number" min="0" value={form.minQuantity} onChange={handleChange} required />
              </label>
              <label>
                Unit Price (Rs.)
                <input name="unitPrice" type="number" min="0" step="0.01" value={form.unitPrice} onChange={handleChange} required />
              </label>
              <label>
                Supplier
                <input name="supplier" value={form.supplier} onChange={handleChange} />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" disabled={loading}>
                {editingId ? 'Update Part' : 'Add Part'}
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
                <th>Part Name</th>
                <th>Part #</th>
                <th>Quantity</th>
                <th>Min. Qty</th>
                <th>Unit Price</th>
                <th>Supplier</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stocks.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty">
                    No parts in inventory. Click "Add Part" to start tracking.
                  </td>
                </tr>
              )}
              {stocks.map((stock) => {
                const status = getStockStatus(stock);
                return (
                  <tr key={stock.id}>
                    <td>
                      <strong>{stock.partName}</strong>
                    </td>
                    <td className="muted">{stock.partNumber}</td>
                    <td style={{ color: stock.quantity === 0 ? '#dc2626' : stock.quantity <= stock.minQuantity ? '#d97706' : 'inherit', fontWeight: stock.quantity <= stock.minQuantity ? 700 : 400 }}>
                      {stock.quantity}
                    </td>
                    <td>{stock.minQuantity}</td>
                    <td>Rs. {stock.unitPrice}</td>
                    <td className="muted">{stock.supplier || '—'}</td>
                    <td>
                      <span className={`status-badge ${status.className}`}>{status.label}</span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="ghost small" onClick={() => handleEdit(stock)} disabled={loading}>
                          Edit
                        </button>
                        <button className="ghost small danger" onClick={() => onDelete(stock.id)} disabled={loading}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
