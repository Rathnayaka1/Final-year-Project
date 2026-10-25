import React, { useState } from 'react';

const VEHICLE_OPTIONS = [
  { value: 'All', label: '🚗🚐🚖 All Vehicles' },
  { value: 'Car', label: '🚗 Car' },
  { value: 'Van', label: '🚐 Van' },
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
    case 'Cab':
      return <span className="badge badge-cab">🚖 Cab</span>;
    default:
      return <span className="badge badge-all">🚗🚐🚖 All</span>;
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
  const [serviceSearch, setServiceSearch] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('all');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const hrs = parseInt(form.durationHours || 0, 10);
    const mins = parseInt(form.durationMinutes || 0, 10);
    const totalDuration = (hrs * 60) + mins;

    const trimmedName = form.name.trim();
    const selectedVehicleType = form.vehicleType || 'All';
    const isDuplicate = services.some(
      (s) =>
        s.id !== editingId &&
        (s.name || '').toLowerCase().trim() === trimmedName.toLowerCase() &&
        (s.vehicleType || 'All').toLowerCase() === selectedVehicleType.toLowerCase()
    );
    if (isDuplicate) {
      alert(`A service named "${trimmedName}" already exists for vehicle category "${selectedVehicleType}".`);
      return;
    }

    let derivedType = 'Body Wash';
    const lower = trimmedName.toLowerCase();
    if (lower.includes('interior') || lower.includes('steam')) derivedType = 'Interior';
    else if (lower.includes('full') || lower.includes('wax') || lower.includes('hybrid') || lower.includes('lube')) derivedType = 'Full Body';

    const payload = {
      name: trimmedName,
      description: form.description,
      duration: totalDuration > 0 ? totalDuration : 30,
      basePrice: Number(form.basePrice) || 0,
      vehicleType: form.vehicleType || 'All',
      serviceType: derivedType
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

      {/* ── Filter Bar ── */}
      <div style={{
        padding: '0.85rem 1.5rem',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.65rem',
        alignItems: 'center'
      }}>
        {/* Service name search */}
        <input
          type="search"
          placeholder="🔍 Search by service name..."
          value={serviceSearch}
          onChange={(e) => setServiceSearch(e.target.value)}
          style={inputSt}
        />

        {/* Vehicle category dropdown */}
        <select
          value={vehicleFilter}
          onChange={(e) => setVehicleFilter(e.target.value)}
          style={inputSt}
        >
          <option value="all">🚗🚐🚖 All Categories</option>
          {VEHICLE_OPTIONS.filter(o => o.value !== 'All').map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#64748b' }}>
          {services.filter(s => {
            const matchName = !serviceSearch.trim() || s.name?.toLowerCase().includes(serviceSearch.toLowerCase());
            const matchVehicle = vehicleFilter === 'all' || (s.vehicleType || 'All') === vehicleFilter || (s.vehicleType || 'All') === 'All';
            return matchName && matchVehicle;
          }).length} / {services.length} shown
        </span>
      </div>

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
            {(() => {
              const filtered = services.filter(s => {
                const matchName = !serviceSearch.trim() || s.name?.toLowerCase().includes(serviceSearch.toLowerCase());
                const matchVehicle = vehicleFilter === 'all' || (s.vehicleType || 'All') === vehicleFilter || (s.vehicleType || 'All') === 'All';
                return matchName && matchVehicle;
              });
              if (filtered.length === 0) return (
                <tr>
                  <td colSpan={6} className="empty">
                    {serviceSearch || vehicleFilter !== 'all'
                      ? 'No services match the selected filters.'
                      : 'No services available. Click "Add Service" to get started.'}
                  </td>
                </tr>
              );
              return filtered.map((service) => (
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
              ));
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inputSt = {
  padding: '0.45rem 0.75rem',
  border: '1.5px solid #e2e8f0',
  borderRadius: '7px',
  fontSize: '0.88rem',
  color: '#0f172a',
  background: '#fff',
  outline: 'none'
};
