import React, { useMemo, useState } from 'react';

const defaultCenter = { lat: 6.9271, lng: 79.8612 };

export default function ServiceCenterManager({ serviceCenters, onCreate, onUpdate, loading }) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    latitude: '',
    longitude: '',
    facilities: '',
    isActive: true
  });

  const mapQuery = useMemo(() => {
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return `${lat},${lng}`;
    }

    if (form.address.trim()) {
      return form.address.trim();
    }

    return `${defaultCenter.lat},${defaultCenter.lng}`;
  }, [form.address, form.latitude, form.longitude]);

  const mapPreviewUrl = useMemo(() => {
    return `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=15&output=embed`;
  }, [mapQuery]);

  const mapSearchUrl = useMemo(() => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
  }, [mapQuery]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const payload = {
      name: form.name,
      address: form.address,
      phone: form.phone,
      email: form.email || undefined,
      coordinates: {
        lat: parseFloat(form.latitude),
        lng: parseFloat(form.longitude)
      },
      facilities: form.facilities ? form.facilities.split(',').map(f => f.trim()).filter(Boolean) : [],
      isActive: form.isActive
    };

    if (editingId) {
      onUpdate(editingId, payload, () => {
        resetForm();
      });
    } else {
      onCreate(payload, () => {
        resetForm();
      });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setIsCreating(false);
    setForm({
      name: '',
      address: '',
      phone: '',
      email: '',
      latitude: '',
      longitude: '',
      facilities: '',
      isActive: true
    });
  };

  const handleEdit = (center) => {
    setEditingId(center.id);
    setForm({
      name: center.name,
      address: center.address,
      phone: center.phone,
      email: center.email || '',
      latitude: center.location?.coordinates?.[1]?.toString() || '',
      longitude: center.location?.coordinates?.[0]?.toString() || '',
      facilities: center.facilities?.join(', ') || '',
      isActive: center.isActive !== false
    });
    setIsCreating(true);
  };

  const getStatusBadge = (center) => {
    if (!center.isActive) {
      return <span className="badge badge-inactive">Inactive</span>;
    }
    const queueLength = center.currentQueueLength || 0;
    if (queueLength === 0) {
      return <span className="badge badge-success">Available</span>;
    } else if (queueLength < 3) {
      return <span className="badge badge-warning">Busy ({queueLength})</span>;
    } else {
      return <span className="badge badge-error">Very Busy ({queueLength})</span>;
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2>🏢 Service Centers</h2>
          <p className="muted">Manage service center locations and information</p>
        </div>
        {!isCreating && (
          <button onClick={() => setIsCreating(true)}>+ Add Service Center</button>
        )}
      </div>

      {isCreating && (
        <form className="service-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Center Name *
              <input 
                name="name" 
                value={form.name} 
                onChange={handleChange} 
                placeholder="Main Service Center"
                required 
              />
            </label>
            <label>
              Phone *
              <input 
                name="phone" 
                type="tel"
                value={form.phone} 
                onChange={handleChange} 
                placeholder="+1234567890"
                required 
              />
            </label>
          </div>

          <label>
            Address *
            <input 
              name="address" 
              value={form.address} 
              onChange={handleChange} 
              placeholder="123 Main St, City, State 12345"
              required 
            />
          </label>

          <div className="map-location-section">
            <div className="map-preview-header">
              <div>
                <strong>Location Preview</strong>
                <p className="hint">Enter coordinates or an address to point out the service center location.</p>
              </div>
              <a className="map-link" href={mapSearchUrl} target="_blank" rel="noreferrer">
                Open in Google Maps
              </a>
            </div>

            <div className="map-preview">
              <iframe
                title="Service center location preview"
                className="map-frame"
                src={mapPreviewUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>

          <div className="form-grid">
            <label>
              Latitude *
              <input 
                name="latitude" 
                type="number"
                step="any"
                value={form.latitude} 
                onChange={handleChange} 
                placeholder="6.9271"
                required 
              />
            </label>
            <label>
              Longitude *
              <input 
                name="longitude" 
                type="number"
                step="any"
                value={form.longitude} 
                onChange={handleChange} 
                placeholder="79.8612"
                required 
              />
            </label>
          </div>

          <label>
            Email
            <input 
              name="email" 
              type="email"
              value={form.email} 
              onChange={handleChange} 
              placeholder="center@example.com"
            />
          </label>

          <label>
            Facilities (comma-separated)
            <input 
              name="facilities" 
              value={form.facilities} 
              onChange={handleChange} 
              placeholder="Parking, WiFi, Waiting Area, Coffee"
            />
          </label>

          <label className="checkbox-label">
            <input 
              type="checkbox"
              name="isActive"
              checked={form.isActive}
              onChange={handleChange}
            />
            <span>Active</span>
          </label>

          <div className="form-actions">
            <button type="submit" disabled={loading}>
              {editingId ? '💾 Update' : '➕ Create'} Service Center
            </button>
            <button type="button" onClick={resetForm} className="secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="service-centers-grid">
        {serviceCenters.length === 0 ? (
          <div className="empty-state">
            <p>📍 No service centers found. Add your first service center to get started.</p>
          </div>
        ) : (
          serviceCenters.map((center) => (
            <div key={center.id} className="service-center-card">
              <div className="center-header">
                <h3>{center.name}</h3>
                {getStatusBadge(center)}
              </div>
              
              <div className="center-details">
                <div className="detail-row">
                  <span className="icon">📍</span>
                  <span>{center.address}</span>
                </div>
                <div className="detail-row">
                  <span className="icon">📞</span>
                  <span>{center.phone}</span>
                </div>
                {center.email && (
                  <div className="detail-row">
                    <span className="icon">✉️</span>
                    <span>{center.email}</span>
                  </div>
                )}
                {center.location?.coordinates && (
                  <div className="detail-row">
                    <span className="icon">🌍</span>
                    <span className="coordinates">
                      {center.location.coordinates[1].toFixed(4)}, {center.location.coordinates[0].toFixed(4)}
                    </span>
                  </div>
                )}
              </div>

              {center.facilities && center.facilities.length > 0 && (
                <div className="facilities">
                  <strong>Facilities:</strong>
                  <div className="facility-tags">
                    {center.facilities.map((facility, idx) => (
                      <span key={idx} className="facility-tag">{facility}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="center-stats">
                <div className="stat">
                  <span className="stat-label">Queue</span>
                  <span className="stat-value">{center.currentQueueLength || 0}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Avg Wait</span>
                  <span className="stat-value">{center.averageWaitTime || 30}m</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Rating</span>
                  <span className="stat-value">⭐ {center.rating?.toFixed(1) || '0.0'}</span>
                </div>
              </div>

              <div className="center-actions">
                <button 
                  onClick={() => handleEdit(center)}
                  className="secondary small"
                >
                  ✏️ Edit
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
