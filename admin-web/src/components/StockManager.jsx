import React, { useState, useEffect, useRef } from 'react';
import InventoryForecast from './InventoryForecast';

export default function StockManager({ stocks, onCreate, onUpdate, onDelete, loading, token }) {
  const [view,setView]=useState('stock');
  const [forecastStockId,setForecastStockId]=useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [stockSearch, setStockSearch] = useState('');
  const [toasts, setToasts] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const shownRef = useRef(false);

  const initialForm = {
    partName: '',
    partNumber: '',
    quantity: 0,
    minQuantity: 10,
    unitPrice: 0,
    unit: 'piece',
    supplier: ''
  };

  const [form, setForm] = useState(initialForm);

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
        setForm(initialForm);
      });
    } else {
      onCreate(form, () => {
        setForm(initialForm);
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
      unit: stock.unit || 'piece',
      supplier: stock.supplier || '',
    });
    setIsCreating(true);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setForm(initialForm);
  };

  const getStockStatus = (stock) => {
    if (stock.quantity === 0) return { label: 'Out of Stock', className: 'status-danger' };
    if (stock.quantity <= stock.minQuantity) return { label: 'Low Stock', className: 'status-warning' };
    return { label: 'In Stock', className: 'status-success' };
  };

  const formatUnit = (unit) => {
    switch (unit) {
      case 'litre': return 'L';
      case 'piece': return 'pcs';
      case 'can': return 'Cans';
      case 'bottle': return 'Bottles';
      case 'barrel': return 'Barrels';
      case 'pair': return 'Pairs';
      case 'axle_set': return 'Axle Sets';
      case 'set': return 'Sets';
      case 'pack': return 'Packs';
      case 'box': return 'Boxes';
      case 'meter': return 'm';
      default: return unit || '';
    }
  };

  return (
    <>
      <div className="inventory-view-tabs" role="tablist" aria-label="Inventory views"><button role="tab" aria-selected={view==='stock'} className="ghost" onClick={()=>setView('stock')}>Stock management</button><button role="tab" aria-selected={view==='forecast'} className="ghost" onClick={()=>setView('forecast')}>Demand forecast</button></div>
      {view==='forecast'&&<InventoryForecast stocks={stocks} token={token} initialStockId={forecastStockId} onUpdate={onUpdate}/>}
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

      {view==='stock'&&<div className="card">
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
                            <p>{stock.quantity === 0 ? 'Out of stock' : `Only ${stock.quantity} ${formatUnit(stock.unit)} left (min: ${stock.minQuantity} ${formatUnit(stock.unit)})`}</p>
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
                <input name="partName" placeholder="e.g. Engine Oil 15W-40, Oil Filter" value={form.partName} onChange={handleChange} required />
              </label>
              <label>
                Part Number / Code
                <input name="partNumber" placeholder="e.g. OIL-ENG-01" value={form.partNumber} onChange={handleChange} required />
              </label>
            </div>
            <div className="form-grid">
              <label>
                Quantity
                <input name="quantity" type="number" min="0" step="any" placeholder="e.g. 50 or 4.5" value={form.quantity} onChange={handleChange} required />
              </label>
              <label>
                Unit of Measure
                <select name="unit" value={form.unit} onChange={handleChange}>
                  <option value="litre">Litre (L) - for Oils & Fluids</option>
                  <option value="can">Can (e.g. 4L / 5L Cans)</option>
                  <option value="bottle">Bottle (e.g. 1L Bottles)</option>
                  <option value="barrel">Barrel (Drum)</option>
                  <option value="piece">Piece (pcs) - Filters, Plugs, etc.</option>
                  <option value="pair">Pair (Wipers, etc.)</option>
                  <option value="set">Set (Brake Pads, Gaskets)</option>
                  <option value="axle_set">Axle Set</option>
                  <option value="pack">Pack</option>
                  <option value="box">Box</option>
                  <option value="meter">Meter (m) - Hoses, Wires</option>
                </select>
              </label>
              <label>
                Min. Quantity (Alert Threshold)
                <input name="minQuantity" type="number" min="0" step="any" placeholder="e.g. 10" value={form.minQuantity} onChange={handleChange} required />
              </label>
              <label>
                Unit Price (Rs.)
                <input name="unitPrice" type="number" min="0" step="0.01" placeholder="e.g. 2500" value={form.unitPrice} onChange={handleChange} required />
              </label>
              <label>
                Supplier
                <input name="supplier" placeholder="e.g. Castrol Lanka, Mobil" value={form.supplier} onChange={handleChange} />
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

        {/* ── Search Bar ── */}
        <div style={{ padding: '0.85rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <input
            type="search"
            placeholder="🔍 Search by part name..."
            value={stockSearch}
            onChange={(e) => setStockSearch(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '360px',
              padding: '0.5rem 0.85rem',
              border: '1.5px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '0.88rem',
              outline: 'none'
            }}
          />
          {stockSearch && (
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              {stocks.filter(s => s.partName?.toLowerCase().includes(stockSearch.toLowerCase())).length} / {stocks.length} shown
            </span>
          )}
        </div>

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
              {(() => {
                const filtered = stocks.filter(s =>
                  !stockSearch.trim() ||
                  s.partName?.toLowerCase().includes(stockSearch.toLowerCase())
                );
                if (filtered.length === 0) return (
                  <tr>
                    <td colSpan={8} className="empty">
                      {stockSearch ? `No parts found for "${stockSearch}"` : 'No parts in inventory. Click "Add Part" to start tracking.'}
                    </td>
                  </tr>
                );
                return filtered.map((stock) => {
                const status = getStockStatus(stock);
                return (
                  <tr key={stock.id}>
                    <td>
                      <strong>{stock.partName}</strong>
                    </td>
                    <td className="muted">{stock.partNumber}</td>
                    <td style={{ color: stock.quantity === 0 ? '#dc2626' : stock.quantity <= stock.minQuantity ? '#d97706' : 'inherit', fontWeight: stock.quantity <= stock.minQuantity ? 700 : 400 }}>
                      {stock.quantity} {formatUnit(stock.unit)}
                    </td>
                    <td>{stock.minQuantity} {formatUnit(stock.unit)}</td>
                    <td>Rs. {stock.unitPrice}</td>
                    <td className="muted">{stock.supplier || '—'}</td>
                    <td>
                      <span className={`status-badge ${status.className}`}>{status.label}</span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="ghost small" onClick={()=>{setForecastStockId(stock.id);setView('forecast');}}>Forecast</button>
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
              });
            })()}
            </tbody>
          </table>
        </div>
      </div>}
    </>
  );
}
