import React, { useState } from 'react';
import { predictPerformance as callPredictAPI } from '../services/api';

// ── ML Model constants (must match trained encoder classes) ──
const ML_TECH_IDS = ['tec_01', 'tec_02', 'tec_03'];
const ML_CENTER_IDS = ['SC001', 'SC002', 'SC003', 'SC004', 'SC005'];
const ML_VEHICLE_TYPES = ['Car', 'Van', 'Cab'];
const ML_SERVICE_TYPES = ['Body Wash', 'Full Body', 'Interior'];
const ML_SERVICE_DISPLAY = { 'Body Wash': 'Body Wash', 'Full Body': 'Full Body', 'Interior': 'Interior Cleaning' };
const ML_SERVICE_TIMES = { 'Body Wash': 1.0, 'Full Body': 3.0, 'Interior': 9.0 };
const ML_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Speed label → display level
function speedToLevel(label) {
  if (!label) return { icon: '🟡', text: 'Normal', color: '#f59e0b', bg: '#fef3c7' };
  const l = label.toLowerCase().trim();
  if (l === 'very fast') return { icon: '🏆', text: 'Excellent', color: '#10b981', bg: '#d1fae5' };
  if (l === 'fast')      return { icon: '✅', text: 'Good',      color: '#3b82f6', bg: '#dbeafe' };
  if (l === 'normal')    return { icon: '🟡', text: 'Normal',    color: '#f59e0b', bg: '#fef3c7' };
  return                        { icon: '🔴', text: 'Needs Training', color: '#ef4444', bg: '#fee2e2' };
}

// ── Predict Modal ───────────────────────────────────────────
function PredictModal({ technician, token, onClose }) {
  const currentMonth = ML_MONTHS[new Date().getMonth()];
  const [form, setForm] = useState({
    mlTechId: ML_TECH_IDS[0],
    centerId: ML_CENTER_IDS[0],
    vehicleType: '',
    serviceType: '',
    month: currentMonth,
    jobCount: '',
    workSuccessRate: '',
    customerRating: '',
    actualTime: '',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const expectedTime = ML_SERVICE_TIMES[form.serviceType] || '';
  const experience = technician?.experienceYears || 0;

  const allFilled = form.mlTechId && form.centerId && form.vehicleType &&
    form.serviceType && form.month && form.jobCount &&
    form.workSuccessRate !== '' && form.customerRating !== '' &&
    form.actualTime && Number(form.actualTime) > 0;

  const handlePredict = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const monthNumber = ML_MONTHS.indexOf(form.month) + 1;
      const payload = {
        center_id: form.centerId,
        technician_id: form.mlTechId,
        vehicle_type: form.vehicleType,
        service_type: form.serviceType,
        month: monthNumber,
        experience_years: Number(experience),
        job_count: Number(form.jobCount),
        work_success_rate: Number(form.workSuccessRate),
        customer_rating: Number(form.customerRating),
        expected_time_hrs: Number(expectedTime),
      };
      const response = await callPredictAPI(payload, token);
      const mlLabel = response.predicted_performance_level;
      setResult({ mlLabel, level: speedToLevel(mlLabel) });
    } catch (err) {
      setError('Prediction failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '8px 10px',
    border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 13,
    outline: 'none', fontFamily: 'inherit', background: '#f9fafb',
  };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4, display: 'block' };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div style={{
        background: '#fff', borderRadius: 18, width: '100%', maxWidth: 520,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 25px 60px rgba(0,0,0,0.2)', fontFamily: "'Inter','Segoe UI',sans-serif"
      }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)', padding: '20px 24px', borderRadius: '18px 18px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em' }}>ML Performance Prediction</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginTop: 2 }}>🤖 {technician?.name}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
              📋 Experience: {experience} yrs &nbsp;·&nbsp; {technician?.specialization}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: 8, width: 32, height: 32, fontSize: 16, fontWeight: 700 }}>✕</button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Info box */}
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 14px', marginBottom: 18, fontSize: 12, color: '#1d4ed8' }}>
            <strong>ℹ️ How this works:</strong> Enter this month's job data for <strong>{technician?.name}</strong>. The ML model will predict their performance speed level (Very Fast → Very Slow).
          </div>

          {/* Auto-filled */}
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', marginBottom: 6 }}>✅ Auto-filled from Technician Profile</div>
            <div style={{ fontSize: 13, color: '#166534' }}>Experience Years: <strong>{experience} yrs</strong></div>
          </div>

          {/* ML Model ID mapping */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>ML Technician ID *</label>
              <select value={form.mlTechId} onChange={e => setForm(p => ({ ...p, mlTechId: e.target.value }))} style={inputStyle}>
                {ML_TECH_IDS.map(id => <option key={id} value={id}>{id}</option>)}
              </select>
              <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3 }}>Model-trained IDs (tec_01–03)</div>
            </div>
            <div>
              <label style={labelStyle}>Service Center *</label>
              <select value={form.centerId} onChange={e => setForm(p => ({ ...p, centerId: e.target.value }))} style={inputStyle}>
                {ML_CENTER_IDS.map(id => <option key={id} value={id}>{id}</option>)}
              </select>
            </div>
          </div>

          {/* Vehicle & Service */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Vehicle Type *</label>
              <select value={form.vehicleType} onChange={e => setForm(p => ({ ...p, vehicleType: e.target.value }))} style={inputStyle}>
                <option value="">Select...</option>
                {ML_VEHICLE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Service Type *</label>
              <select value={form.serviceType} onChange={e => setForm(p => ({ ...p, serviceType: e.target.value }))} style={inputStyle}>
                <option value="">Select...</option>
                {ML_SERVICE_TYPES.map(s => <option key={s} value={s}>{ML_SERVICE_DISPLAY[s]}</option>)}
              </select>
            </div>
          </div>

          {/* Expected time auto-fill display */}
          {expectedTime && (
            <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#92400e' }}>
              ⏱ Expected time for <strong>{ML_SERVICE_DISPLAY[form.serviceType]}</strong>: <strong>{expectedTime} hrs</strong> (auto-set by model)
            </div>
          )}

          {/* Month, Job count */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Month *</label>
              <select value={form.month} onChange={e => setForm(p => ({ ...p, month: e.target.value }))} style={inputStyle}>
                {ML_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Jobs Done This Month *</label>
              <input type="number" min="0" placeholder="e.g. 30" value={form.jobCount}
                onChange={e => setForm(p => ({ ...p, jobCount: e.target.value }))} style={inputStyle} />
            </div>
          </div>

          {/* Success rate, rating, actual time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 18 }}>
            <div>
              <label style={labelStyle}>Success Rate %</label>
              <input type="number" min="0" max="100" placeholder="0–100" value={form.workSuccessRate}
                onChange={e => setForm(p => ({ ...p, workSuccessRate: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Avg Rating (1–5)</label>
              <input type="number" min="1" max="5" step="0.1" placeholder="e.g. 4.2" value={form.customerRating}
                onChange={e => setForm(p => ({ ...p, customerRating: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Actual Time (hrs)</label>
              <input type="number" min="0.1" step="0.1" placeholder="e.g. 0.9" value={form.actualTime}
                onChange={e => setForm(p => ({ ...p, actualTime: e.target.value }))} style={inputStyle} />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: '#fee2e2', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 14 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div style={{ background: result.level.bg, border: `2px solid ${result.level.color}40`, borderRadius: 12, padding: '16px 20px', marginBottom: 18, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 6 }}>{result.level.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: result.level.color }}>{result.level.text}</div>
              <div style={{ fontSize: 13, color: result.level.color, opacity: 0.8, marginTop: 4 }}>
                🤖 ML Model Output: <strong>"{result.mlLabel}"</strong>
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
                Powered by trained ML model (predict.py) &nbsp;·&nbsp; {technician?.name}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handlePredict}
              disabled={!allFilled || loading}
              style={{
                flex: 1, padding: '13px 0', borderRadius: 10, border: 'none',
                background: allFilled && !loading ? 'linear-gradient(135deg,#f59e0b,#ea580c)' : '#e5e7eb',
                color: allFilled && !loading ? '#fff' : '#9ca3af',
                fontWeight: 800, fontSize: 14, cursor: allFilled && !loading ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}
            >
              {loading ? '🔄 Predicting...' : '🤖 Predict Performance'}
            </button>
            <button onClick={onClose} style={{ padding: '13px 20px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main TechnicianManager ──────────────────────────────────
export default function TechnicianManager({ technicians, serviceCenters, onCreate, onUpdate, onDelete, loading, token }) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [predictingTech, setPredictingTech] = useState(null); // which technician to predict
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    specialization: '',
    experienceYears: 0,
    status: 'active',
    serviceCenter: '',
    skills: '',
    notes: ''
  });

  const resetForm = () => {
    setEditingId(null);
    setIsCreating(false);
    setForm({
      name: '',
      phone: '',
      email: '',
      specialization: '',
      experienceYears: 0,
      status: 'active',
      serviceCenter: '',
      skills: '',
      notes: ''
    });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const payload = {
      name: form.name,
      phone: form.phone,
      email: form.email || undefined,
      specialization: form.specialization,
      experienceYears: Number(form.experienceYears) || 0,
      status: form.status,
      serviceCenter: form.serviceCenter || null,
      skills: form.skills,
      notes: form.notes
    };

    if (editingId) {
      onUpdate(editingId, payload, resetForm);
    } else {
      onCreate(payload, resetForm);
    }
  };

  const handleEdit = (technician) => {
    setEditingId(technician.id);
    setForm({
      name: technician.name || '',
      phone: technician.phone || '',
      email: technician.email || '',
      specialization: technician.specialization || '',
      experienceYears: technician.experienceYears || 0,
      status: technician.status || 'active',
      serviceCenter: technician.serviceCenter?.id || technician.serviceCenter || '',
      skills: Array.isArray(technician.skills) ? technician.skills.join(', ') : '',
      notes: technician.notes || ''
    });
    setIsCreating(true);
  };

  return (
    <div className="card">
      {/* Predict Modal */}
      {predictingTech && (
        <PredictModal
          technician={predictingTech}
          token={token}
          onClose={() => setPredictingTech(null)}
        />
      )}

      <div className="card-header">
        <div>
          <h2>🔧 Technician Management</h2>
          <p className="muted">Add technicians and assign them to service centers. Use 🤖 to predict ML performance.</p>
        </div>
        {!isCreating && (
          <button onClick={() => setIsCreating(true)}>+ Add Technician</button>
        )}
      </div>

      {isCreating && (
        <form className="service-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Name *
              <input name="name" value={form.name} onChange={handleChange} required />
            </label>
            <label>
              Phone *
              <input name="phone" value={form.phone} onChange={handleChange} required />
            </label>
          </div>

          <div className="form-grid">
            <label>
              Email
              <input name="email" type="email" value={form.email} onChange={handleChange} />
            </label>
            <label>
              Specialization *
              <input name="specialization" value={form.specialization} onChange={handleChange} required />
            </label>
          </div>

          <div className="form-grid">
            <label>
              Experience Years
              <input name="experienceYears" type="number" min="0" value={form.experienceYears} onChange={handleChange} />
            </label>
            <label>
              Status
              <select name="status" value={form.status} onChange={handleChange}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on_leave">On Leave</option>
              </select>
            </label>
          </div>

          <label>
            Assign to Service Center
            <select name="serviceCenter" value={form.serviceCenter} onChange={handleChange}>
              <option value="">Unassigned</option>
              {serviceCenters.map((center) => (
                <option key={center.id} value={center.id}>
                  {center.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Skills (comma-separated)
            <input name="skills" value={form.skills} onChange={handleChange} placeholder="Engine repair, AC, Diagnostics" />
          </label>

          <label>
            Notes
            <textarea name="notes" rows="3" value={form.notes} onChange={handleChange} />
          </label>

          <div className="form-actions">
            <button type="submit" disabled={loading}>
              {editingId ? '💾 Update' : '➕ Create'} Technician
            </button>
            <button type="button" onClick={resetForm} className="secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Specialization</th>
              <th>Experience</th>
              <th>Service Center</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {technicians.length === 0 && (
              <tr>
                <td colSpan={7} className="empty">
                  No technicians found. Add one to get started.
                </td>
              </tr>
            )}
            {technicians.map((technician) => (
              <tr key={technician.id}>
                <td><strong>{technician.name}</strong></td>
                <td>{technician.phone}</td>
                <td>{technician.specialization}</td>
                <td>{technician.experienceYears || 0} yrs</td>
                <td className="muted small">
                  {technician.serviceCenter?.name || 'Unassigned'}
                </td>
                <td>
                  <span className={`badge badge-${technician.status === 'active' ? 'success' : technician.status === 'on_leave' ? 'warning' : 'inactive'}`}>
                    {technician.status.replace('_', ' ')}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    {/* 🤖 Predict Performance button */}
                    <button
                      className="ghost small"
                      title="Predict ML Performance"
                      onClick={() => setPredictingTech(technician)}
                      disabled={loading}
                      style={{ background: 'linear-gradient(135deg,#f59e0b22,#ea580c11)', borderColor: '#f59e0b', color: '#d97706', fontWeight: 700 }}
                    >
                      🤖 Predict
                    </button>
                    <button className="ghost small" onClick={() => handleEdit(technician)} disabled={loading}>
                      Edit
                    </button>
                    <button className="ghost small danger" onClick={() => onDelete(technician.id)} disabled={loading}>
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
