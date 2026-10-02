import React, { useState } from 'react';

export default function ServiceManager({ services, onCreate, onUpdate, onDelete, loading }) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    duration: 30,
    basePrice: 0
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
        setForm({ name: '', description: '', duration: 30, basePrice: 0 });
      });
    } else {
      onCreate(form, () => {
        setForm({ name: '', description: '', duration: 30, basePrice: 0 });
        setIsCreating(false);
      });
    }
  };

  const handleEdit = (service) => {
    setEditingId(service.id);
    setForm({
      name: service.name,
      description: service.description,
      duration: service.duration,
      basePrice: service.basePrice
    });
    setIsCreating(true);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setForm({ name: '', description: '', duration: 30, basePrice: 0 });
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2>🛠️ Service Management</h2>
          <p className="muted">Manage service catalog with pricing and scheduling</p>
        </div>
        {!isCreating && (
          <button onClick={() => setIsCreating(true)}>+ Add Service</button>
        )}
      </div>

      {isCreating && (
        <form className="service-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Service Name
              <input name="name" value={form.name} onChange={handleChange} required />
            </label>
            <label>
              Duration (minutes)
              <input
                name="duration"
                type="number"
                min="10"
                value={form.duration}
                onChange={handleChange}
                required
              />
            </label>
          </div>
          <label>
            Description
            <textarea
              name="description"
              rows="2"
              value={form.description}
              onChange={handleChange}
              placeholder="Brief description of this service"
            />
          </label>
          <label>
            Base Price (Rs.)
            <input
              name="basePrice"
              type="number"
              min="0"
              step="0.01"
              value={form.basePrice}
              onChange={handleChange}
              required
            />
          </label>
          <div className="form-actions">
            <button type="submit" disabled={loading}>
              {editingId ? 'Update Service' : 'Create Service'}
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
              <th>Service</th>
              <th>Description</th>
              <th>Duration</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  No services available. Click "Add Service" to get started.
                </td>
              </tr>
            )}
            {services.map((service) => (
              <tr key={service.id}>
                <td>
                  <strong>{service.name}</strong>
                </td>
                <td className="muted">{service.description || '—'}</td>
                <td>{service.duration} min</td>
                <td>Rs. {service.basePrice}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="ghost small"
                      onClick={() => handleEdit(service)}
                      disabled={loading}
                    >
                      Edit
                    </button>
                    <button
                      className="ghost small danger"
                      onClick={() => onDelete(service.id)}
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
