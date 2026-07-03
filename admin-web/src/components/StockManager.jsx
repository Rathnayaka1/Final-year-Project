import React, { useState } from 'react';

export default function StockManager({ stocks, onCreate, onUpdate, onDelete, loading }) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    partName: '',
    partNumber: '',
    quantity: 0,
    minQuantity: 10,
    unitPrice: 0,
    supplier: ''
  });

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
      supplier: stock.supplier
    });
    setIsCreating(true);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setForm({ partName: '', partNumber: '', quantity: 0, minQuantity: 10, unitPrice: 0, supplier: '' });
  };

  const getLowStockCount = () => {
    return stocks.filter((stock) => stock.quantity <= stock.minQuantity).length;
  };

  const getStockStatus = (stock) => {
    if (stock.quantity === 0) return { label: 'Out of Stock', className: 'status-danger' };
    if (stock.quantity <= stock.minQuantity) return { label: 'Low Stock', className: 'status-warning' };
    return { label: 'In Stock', className: 'status-success' };
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2>📦 Spare Parts Inventory</h2>
          <p className="muted">
            Track stock levels and suppliers • {getLowStockCount()} low stock alerts
          </p>
        </div>
        {!isCreating && (
          <button onClick={() => setIsCreating(true)}>+ Add Part</button>
        )}
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
              <input
                name="quantity"
                type="number"
                min="0"
                value={form.quantity}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Min. Quantity (Alert Threshold)
              <input
                name="minQuantity"
                type="number"
                min="0"
                value={form.minQuantity}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Unit Price (Rs.)
              <input
                name="unitPrice"
                type="number"
                min="0"
                step="0.01"
                value={form.unitPrice}
                onChange={handleChange}
                required
              />
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
                  <td>{stock.quantity}</td>
                  <td>{stock.minQuantity}</td>
                  <td>Rs. {stock.unitPrice}</td>
                  <td className="muted">{stock.supplier || '—'}</td>
                  <td>
                    <span className={`status-badge ${status.className}`}>{status.label}</span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="ghost small"
                        onClick={() => handleEdit(stock)}
                        disabled={loading}
                      >
                        Edit
                      </button>
                      <button
                        className="ghost small danger"
                        onClick={() => onDelete(stock.id)}
                        disabled={loading}
                      >
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
  );
}
