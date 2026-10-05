import React, { useState } from 'react';

const VEHICLE_OPTIONS = [
  { value: 'All', label: '🚗🚐 All Vehicles' },
  { value: 'Car', label: '🚗 Car' },
  { value: 'Van', label: '🚐 Van' },
  { value: 'Mini Bus', label: '🚌 Mini Bus' },
  { value: 'Cab', label: '🚖 Cab' }
];

function formatDuration(totalMinutes) {
  const mins = Number(totalMinutes) || 0;
  if (mins <= 0) return '—';
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;

  if (hrs > 0 && remMins > 0) return `${hrs} hr ${remMins} min`;
  if (hrs > 0) return `${hrs} ${hrs === 1 ? 'hr' : 'hrs'}`;
  return `${remMins} min`;
}

function getVehicleBadge(type) {
  switch (type) {
    case 'Car':
      return <span className="badge badge-car">🚗 Car</span>;
    case 'Van':
      return <span className="badge badge-van">🚐 Van</span>;
    case 'Mini Bus':
      return <span className="badge badge-bus">🚌 Mini Bus</span>;
    case 'Cab':
      return <span className="badge badge-cab">🚖 Cab</span>;
    default:
      return <span className="badge badge-all">🚗🚐 All Vehicles</span>;
  }
}

const initialForm = {
  name: '',
  description: '',
  durationHours: 0,
  durationMinutes: 30,
  basePrice: 0,
  vehicleType: 'All'
};

export default function ServiceManager({ services, onCreate, onUpdate, onDelete, loading }) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const hrs = parseInt(form.durationHours || 0, 10);
    const mins = parseInt(form.durationMinutes || 0, 10);
    const totalDuration = (hrs * 60) + mins;

    const payload = {
      name: form.name,
      description: form.description,
      duration: totalDuration > 0 ? totalDuration : 30,
      basePrice: Number(form.basePrice) || 0,
      vehicleType: form.vehicleType || 'All'
    };

    if (editingId) {
      onUpdate(editingId, payload, () => {
        setEditingId(null);
        setForm(initialForm);
        setIsCreating(false);
      });
    } else {
      onCreate(payload, () => {
        setForm(initialForm);
        setIsCreating(false);
      });
    }
  };

  const handleEdit = (service) => {
    setEditingId(service.id);
    const totalMin = Number(service.duration) || 0;
    setForm({
      name: service.name || '',
      description: service.description || '',
      durationHours: Math.floor(totalMin / 60),
      durationMinutes: totalMin % 60,
      basePrice: service.basePrice || 0,
      vehicleType: service.vehicleType || 'All'
    });
    setIsCreating(true);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setForm(initialForm);
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2>🛠️ Service Management</h2>
          <p className="muted">Manage service catalog with pricing, vehicle suitability, and scheduling</p>
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
              <input 
                name="name" 
                value={form.name} 
                onChange={handleChange} 
                placeholder="e.g. Full Body Wash & Wax" 
                required 
              />
            </label>

            <label>
              Vehicle Category (Suitable For)
              <select 
                name="vehicleType" 
                value={form.vehicleType} 
                onChange={handleChange}
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                  background: '#fff'
                }}
              >
                {VEHICLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-grid">
            <label>
              Duration - Hours
              <input
                name="durationHours"
                type="number"
                min="0"
                max="48"
                value={form.durationHours}
                onChange={handleChange}
                placeholder="0"
              />
            </label>
            <label>
              Duration - Minutes
              <input
                name="durationMinutes"
                type="number"
                min="0"
                max="59"
                step="5"
                value={form.durationMinutes}
                onChange={handleChange}
                placeholder="30"
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
              <th>Service Name</th>
              <th>Vehicle Category</th>
              <th>Description</th>
              <th>Duration</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  No services available. Click "Add Service" to get started.
                </td>
              </tr>
            )}
            {services.map((service) => (
              <tr key={service.id}>
                <td>
                  <strong>{service.name}</strong>
                </td>
                <td>{getVehicleBadge(service.vehicleType)}</td>
                <td className="muted">{service.description || '—'}</td>
                <td>{formatDuration(service.duration)}</td>
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
