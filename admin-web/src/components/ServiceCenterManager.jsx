import React, { useMemo, useState, useEffect } from 'react';

const defaultCenter = { lat: 6.9271, lng: 79.8612 };

export default function ServiceCenterManager({ serviceCenters, currentCenterId, onUpdate, loading }) {
  // Find current center matching logged-in user's center ID, otherwise fall back to first item
  const currentCenter = useMemo(() => {
    if (!serviceCenters || serviceCenters.length === 0) return null;
    if (currentCenterId) {
      const match = serviceCenters.find(
        (c) => String(c.id || c._id) === String(currentCenterId)
      );
      if (match) return match;
    }
    return serviceCenters[0];
  }, [serviceCenters, currentCenterId]);

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
  const [locLoading, setLocLoading] = useState(false);
  const [locSuccess, setLocSuccess] = useState('');
  const [locError, setLocError] = useState('');

  const handleFindCoordinates = async () => {
    const address = form.address.trim();
    if (!address) {
      setLocError('Please enter a service center address first.');
      setTimeout(() => setLocError(''), 4000);
      return;
    }
    setLocLoading(true);
    setLocError('');
    setLocSuccess('');

    try {
      // Build candidate search queries (from full address down to town/city)
      const cleanAddress = address.replace(/\s+/g, ' ');
      const segments = cleanAddress.split(',').map(s => s.trim()).filter(Boolean);
      
      const candidateQueries = [];
      // 1. Full address with Sri Lanka
      candidateQueries.push(cleanAddress.toLowerCase().includes('sri lanka') ? cleanAddress : `${cleanAddress}, Sri Lanka`);
      // 2. Full address as entered
      candidateQueries.push(cleanAddress);
      
      // 3. Progressive subsets if commas exist (e.g. drop house/building number)
      if (segments.length > 1) {
        // Skip first segment (house number)
        const withoutFirst = segments.slice(1).join(', ');
        candidateQueries.push(withoutFirst.toLowerCase().includes('sri lanka') ? withoutFirst : `${withoutFirst}, Sri Lanka`);
        // Last segment (city/district/area)
        const lastSegment = segments[segments.length - 1];
        candidateQueries.push(lastSegment.toLowerCase().includes('sri lanka') ? lastSegment : `${lastSegment}, Sri Lanka`);
        candidateQueries.push(lastSegment);
      }

      let found = null;
      for (const query of candidateQueries) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
            headers: { 'Accept': 'application/json' }
          });
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            found = data[0];
            break;
          }
        } catch (e) {
          // continue to next query
        }
      }

      if (found) {
        const lat = parseFloat(found.lat).toFixed(6);
        const lng = parseFloat(found.lon).toFixed(6);
        setForm((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng
        }));
        const placeName = found.display_name.split(',')[0];
        setLocSuccess(`📍 Pinned to "${placeName}": (${lat}, ${lng}) — Latitude & Longitude auto-filled!`);
        setTimeout(() => setLocSuccess(''), 7000);
      } else {
        setLocError('Could not find map location for this address. Please try adding city/town or enter coordinates manually.');
        setTimeout(() => setLocError(''), 6000);
      }
    } catch (err) {
      setLocError('Failed to search coordinates. Please enter manually.');
      setTimeout(() => setLocError(''), 5000);
    } finally {
      setLocLoading(false);
    }
  };

  useEffect(() => {
    if (currentCenter) {
      // If address is an initial dummy text, leave it blank so admin types manually
      const isDummyAddress = (addr) => {
        if (!addr) return true;
        const lower = addr.toLowerCase().trim();
        return (
          lower.includes('123 main street') ||
          lower.includes('456 west avenue') ||
          lower.includes('main workshop')
        );
      };

      setForm({
        name: currentCenter.name || '',
        address: isDummyAddress(currentCenter.address) ? '' : (currentCenter.address || ''),
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
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                name="address" 
                value={form.address} 
                onChange={handleChange} 
                placeholder="Type service center address manually (e.g. 123 Galle Road, Colombo 03)"
                required 
                style={{ width: '100%', paddingRight: form.address ? '2.5rem' : '0.75rem' }}
              />
              {form.address && (
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, address: '' }))}
                  title="Clear address to re-type manually"
                  style={{
                    position: 'absolute',
                    right: '8px',
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    padding: '2px 6px',
                    lineHeight: 1
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </label>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.5rem', marginBottom: '1rem' }}>
            <button
              type="button"
              onClick={handleFindCoordinates}
              disabled={locLoading || !form.address.trim()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: locLoading ? 'wait' : 'pointer',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1d4ed8'
              }}
            >
              {locLoading ? '⏳ Searching Map...' : '📍 Pin on Map'}
            </button>
          </div>

          {locSuccess && (
            <div style={{
              backgroundColor: '#dcfce7',
              color: '#166534',
              padding: '0.65rem 1rem',
              borderRadius: '6px',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              border: '1px solid #bbf7d0'
            }}>
              ✅ {locSuccess}
            </div>
          )}

          {locError && (
            <div style={{
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              padding: '0.65rem 1rem',
              borderRadius: '6px',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              border: '1px solid #fecaca'
            }}>
              ⚠️ {locError}
            </div>
          )}

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
              Latitude (Auto-filled from Pin) *
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
              Longitude (Auto-filled from Pin) *
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
