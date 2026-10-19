import React, { useMemo, useState, useEffect } from 'react';

const defaultCenter = { lat: 6.9271, lng: 79.8612 };

export default function ServiceCenterManager({ serviceCenters, onUpdate, loading }) {
  // Since each admin manages their own service center, pick the current center
  const currentCenter = serviceCenters && serviceCenters.length > 0 ? serviceCenters[0] : null;

  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    latitude: '6.9271',
    longitude: '79.8612',
    facilities: '',
    isActive: true
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (currentCenter) {
      setForm({
        name: currentCenter.name || '',
        address: currentCenter.address || '',
        phone: currentCenter.phone || '',
        email: currentCenter.email || '',
        latitude: currentCenter.location?.coordinates?.[1]?.toString() || '6.9271',
        longitude: currentCenter.location?.coordinates?.[0]?.toString() || '79.8612',
        facilities: currentCenter.facilities?.join(', ') || '',
        isActive: currentCenter.isActive !== false
      });
    }
  }, [currentCenter]);

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
    if (!currentCenter) return;
    
    const payload = {
      name: form.name,
      address: form.address,
      phone: form.phone,
      email: form.email || undefined,
      coordinates: {
        lat: parseFloat(form.latitude) || 6.9271,
        lng: parseFloat(form.longitude) || 79.8612
      },
      facilities: form.facilities ? form.facilities.split(',').map(f => f.trim()).filter(Boolean) : [],
      isActive: form.isActive
    };

    onUpdate(currentCenter.id, payload, () => {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    });
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
          <h2>🏢 Service Center Registration &amp; Profile</h2>
          <p className="muted">
            Complete and update your service center's official registration details, map location, and facilities.
          </p>
        </div>
        {currentCenter && getStatusBadge(currentCenter)}
      </div>

      {savedSuccess && (
        <div style={{
          backgroundColor: '#dcfce7',
          color: '#166534',
          padding: '0.85rem 1.25rem',
          borderRadius: '8px',
          marginBottom: '1.25rem',
          fontWeight: '500',
          border: '1px solid #bbf7d0'
        }}>
          ✅ Service Center registration details updated successfully!
        </div>
      )}

      {currentCenter ? (
        <form className="service-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Service Center Name *
              <input 
                name="name" 
                value={form.name} 
                onChange={handleChange} 
                placeholder="e.g. Kandy Auto Hub"
                required 
              />
            </label>
            <label>
              Official Contact Phone *
              <input 
                name="phone" 
                type="tel"
                value={form.phone} 
                onChange={handleChange} 
                placeholder="+94112345678"
                required 
              />
            </label>
          </div>

          <label>
            Service Center Address *
            <input 
              name="address" 
              value={form.address} 
              onChange={handleChange} 
              placeholder="e.g. 123 Colombo Road, Kandy"
              required 
            />
          </label>

          <div className="map-location-section">
            <div className="map-preview-header">
              <div>
                <strong>Location Preview (Customer Mobile App Map)</strong>
                <p className="hint">
                  Enter coordinates or an address to pinpoint where your service center appears on the customer map.
                </p>
              </div>
              <a className="map-link" href={mapSearchUrl} target="_blank" rel="noreferrer">
                Open in Google Maps ↗
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
              Latitude (Map Coordinate) *
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
              Longitude (Map Coordinate) *
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

          <div className="form-grid">
            <label>
              Support Email
              <input 
                name="email" 
                type="email"
                value={form.email} 
                onChange={handleChange} 
                placeholder="contact@servicecenter.com"
              />
            </label>
            <label>
              Facilities &amp; Amenities (comma-separated)
              <input 
                name="facilities" 
                value={form.facilities} 
                onChange={handleChange} 
                placeholder="Customer Lounge, WiFi, Vehicle Lift, AC Waiting Area"
              />
            </label>
          </div>

          <label className="checkbox-label" style={{ marginTop: '0.5rem' }}>
            <input 
              type="checkbox"
              name="isActive"
              checked={form.isActive}
              onChange={handleChange}
            />
            <span>Open &amp; Active for Online Bookings</span>
          </label>

          <div className="form-actions" style={{ marginTop: '1.25rem' }}>
            <button type="submit" disabled={loading}>
              {loading ? 'Saving…' : '💾 Save & Update Service Center Registration'}
            </button>
          </div>
        </form>
      ) : (
        <div className="empty-state">
          <p>📍 Loading service center registration details...</p>
        </div>
      )}
    </div>
  );
}
