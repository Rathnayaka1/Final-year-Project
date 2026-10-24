import React, { useState, useEffect, useMemo } from 'react';
import { predictTechnicians } from '../services/api';

export default function TechnicianManager({ technicians = [], onCreate, onUpdate, onDelete, loading, token }) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    specialization: '',
    experienceYears: 0,
    status: 'active',
    skills: '',
    notes: '',
    totalJobs: 0,
    averageRating: 4.5,
    successRate: 98
  });

  // ── AI Scenario & Prediction State ───────────────────────────
  const [scenarioVehicle, setScenarioVehicle] = useState('Car');
  const [scenarioService, setScenarioService] = useState('Interior');
  const [predictionsMap, setPredictionsMap] = useState({});
  const [predicting, setPredicting] = useState(false);
  const [activeModalTech, setActiveModalTech] = useState(null);
  const [modalMatrix, setModalMatrix] = useState(null);
  const [loadingModalMatrix, setLoadingModalMatrix] = useState(false);

  // Fetch AI Predictions for the current scenario
  useEffect(() => {
    if (!technicians || technicians.length === 0) {
      setPredictionsMap({});
      return;
    }

    let isMounted = true;
    setPredicting(true);

    predictTechnicians(
      {
        technicians,
        vehicleType: scenarioVehicle,
        serviceType: scenarioService
      },
      token
    )
      .then((res) => {
        if (!isMounted) return;
        const map = {};
        (res.technicians || []).forEach((t) => {
          const id = t.id || t._id;
          if (id && t.aiPrediction) {
            map[id] = t.aiPrediction;
          }
        });
        setPredictionsMap(map);
      })
      .catch((err) => {
        console.warn('AI prediction request failed:', err);
      })
      .finally(() => {
        if (isMounted) setPredicting(false);
      });

    return () => {
      isMounted = false;
    };
  }, [technicians, scenarioVehicle, scenarioService, token]);

  // Form Reset
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
      skills: '',
      notes: '',
      totalJobs: 0,
      averageRating: 4.5,
      successRate: 98
    });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === 'phone') {
      const cleaned = value.replace(/[^0-9+\-\s]/g, '');
      setForm((prev) => ({ ...prev, phone: cleaned }));
      return;
    }
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
    setEditingId(technician.id || technician._id);
    setForm({
      name: technician.name || '',
      phone: technician.phone || '',
      email: technician.email || '',
      specialization: technician.specialization || '',
      experienceYears: technician.experienceYears || 0,
      status: technician.status || 'active',
      skills: Array.isArray(technician.skills) ? technician.skills.join(', ') : '',
      notes: technician.notes || '',
      totalJobs: technician.totalJobs || 0,
      averageRating: technician.averageRating || 4.5,
      successRate: technician.successRate || 98
    });
    setIsCreating(true);
  };

  // ── Open AI Insight Modal ────────────────────────────────────
  const handleOpenAiModal = async (technician) => {
    setActiveModalTech(technician);
    setLoadingModalMatrix(true);

    const vehicles = ['Car', 'Van', 'Cab'];
    const services = ['Interior', 'Full Body', 'Body Wash'];

    try {
      const matrixResults = { Car: {}, Van: {}, Cab: {} };
      const tasks = [];
      for (const v of vehicles) {
        for (const s of services) {
          tasks.push(
            predictTechnicians(
              {
                technicians: [technician],
                vehicleType: v,
                serviceType: s
              },
              token
            ).then((res) => {
              const pred = res?.technicians?.[0]?.aiPrediction || { level: 'MEDIUM' };
              matrixResults[v][s] = pred.level;
            })
          );
        }
      }
      await Promise.all(tasks);
      setModalMatrix(matrixResults);
    } catch (e) {
      console.warn('Matrix prediction failed:', e);
    } finally {
      setLoadingModalMatrix(false);
    }
  };

  // Live forecast preview inside Form
  const formAiPreviewLevel = useMemo(() => {
    const exp = Number(form.experienceYears) || 0;
    const rating = Number(form.averageRating) || 4.5;
    const success = Number(form.successRate) || 98;
    if (exp >= 4 && rating >= 4.5 && success >= 92) return 'HIGH';
    if (exp >= 2 || rating >= 4.0) return 'MEDIUM';
    return 'LOW';
  }, [form.experienceYears, form.averageRating, form.successRate]);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2>🔧 Technician Management</h2>
          <p className="muted">Add, manage, and evaluate technician performance predictions.</p>
        </div>
        {!isCreating && (
          <button onClick={() => setIsCreating(true)}>+ Add Technician</button>
        )}
      </div>

      {/* ── Scenario Switcher Bar ─────────────────────────────── */}
      <div className="ai-scenario-bar">
        <div className="ai-scenario-title">
          <span>⚡ AI Performance Prediction Scenario:</span>
          {predicting && <span className="muted" style={{ fontSize: '0.8rem' }}>(Recalculating…)</span>}
        </div>
        <div className="ai-scenario-controls">
          <label>
            Vehicle:
            <select
              value={scenarioVehicle}
              onChange={(e) => setScenarioVehicle(e.target.value)}
              disabled={predicting}
            >
              <option value="Car">🚗 Car</option>
              <option value="Van">🚐 Van</option>
              <option value="Cab">🚖 Cab</option>
            </select>
          </label>

          <label>
            Service:
            <select
              value={scenarioService}
              onChange={(e) => setScenarioService(e.target.value)}
              disabled={predicting}
            >
              <option value="Interior">Interior Deep Clean</option>
              <option value="Full Body">Full Body Foam Wash</option>
              <option value="Body Wash">Body Wash & Vacuum</option>
            </select>
          </label>
        </div>
      </div>

      {/* ── Create / Edit Form ────────────────────────────────── */}
      {isCreating && (
        <form className="service-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Name *
              <input name="name" value={form.name} onChange={handleChange} required />
            </label>
            <label>
              Phone *
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                required
                pattern="[0-9+\-\s]{7,15}"
                placeholder="e.g. +94771234567"
              />
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
              <input
                name="experienceYears"
                type="number"
                min="0"
                value={form.experienceYears}
                onChange={handleChange}
              />
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
            Skills (comma-separated)
            <input
              name="skills"
              value={form.skills}
              onChange={handleChange}
              placeholder="Engine repair, AC, Diagnostics"
            />
          </label>

          <label>
            Notes
            <textarea name="notes" rows="3" value={form.notes} onChange={handleChange} />
          </label>

          {/* ── Live AI Forecast Preview in Form ───────────────── */}
          <div className="ai-preview-box">
            <div className="ai-preview-title">
              <span>🤖 Live AI Performance Forecast</span>
              <span className={`badge ${formAiPreviewLevel === 'HIGH' ? 'badge-ai-high' : formAiPreviewLevel === 'MEDIUM' ? 'badge-ai-medium' : 'badge-ai-low'}`}>
                {formAiPreviewLevel} Efficiency
              </span>
            </div>
            <p className="ai-preview-desc">
              Based on {form.experienceYears || 0} years experience and specialization in &ldquo;{form.specialization || 'General'}&rdquo;, 
              the model forecasts {formAiPreviewLevel.toLowerCase()} turnaround performance for {scenarioVehicle} {scenarioService} services.
            </p>
          </div>

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

      {/* ── Technicians Table with AI Column ──────────────────── */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Specialization</th>
              <th>Experience</th>
              <th>AI Performance Level ({scenarioVehicle})</th>
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
            {technicians.map((technician) => {
              const techId = technician.id || technician._id;
              const ai = predictionsMap[techId];
              const isHigh = ai?.level === 'HIGH';
              const isMedium = ai?.level === 'MEDIUM';
              const isLow = ai?.level === 'LOW';
              const isTop = ai?.isTopRecommendation;

              return (
                <tr key={techId}>
                  <td><strong>{technician.name}</strong></td>
                  <td>{technician.phone}</td>
                  <td>{technician.specialization}</td>
                  <td>{technician.experienceYears || 0} yrs</td>
                  <td>
                    {predicting ? (
                      <span className="muted" style={{ fontSize: '0.8rem' }}>Evaluating…</span>
                    ) : ai ? (
                      <div>
                        <span
                          className={`badge ${
                            isHigh
                              ? 'badge-ai-high'
                              : isMedium
                              ? 'badge-ai-medium'
                              : 'badge-ai-low'
                          }`}
                        >
                          {isHigh ? '🟢 HIGH' : isMedium ? '🟡 MEDIUM' : '⚪ STANDARD'}
                        </span>
                        {isTop && <span className="badge-ai-top">⭐ Top Pick</span>}
                        {ai.confidence && (
                          <span className="muted" style={{ fontSize: '0.75rem', marginLeft: '6px' }}>
                            ({Math.round(ai.confidence * 100)}%)
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`badge badge-${
                        technician.status === 'active'
                          ? 'success'
                          : technician.status === 'on_leave'
                          ? 'warning'
                          : 'inactive'
                      }`}
                    >
                      {(technician.status || 'active').replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="ghost small"
                        style={{ color: '#0284c7', borderColor: '#bae6fd', background: '#f0f9ff' }}
                        onClick={() => handleOpenAiModal(technician)}
                        title="Inspect technician performance matrix"
                      >
                        📊 Performance Matrix
                      </button>
                      <button
                        className="ghost small"
                        onClick={() => handleEdit(technician)}
                        disabled={loading}
                      >
                        Edit
                      </button>
                      <button
                        className="ghost small danger"
                        onClick={() => onDelete(techId)}
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

      {/* ── AI Insight Modal ──────────────────────────────────── */}
      {activeModalTech && (
        <div className="ai-modal-backdrop" onClick={() => setActiveModalTech(null)}>
          <div className="ai-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>
                📊 Performance Matrix: {activeModalTech.name}
              </h3>
              <button
                className="ghost small"
                onClick={() => setActiveModalTech(null)}
                style={{ fontSize: '1.2rem', padding: '2px 8px' }}
              >
                ✕
              </button>
            </div>

            <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 16 }}>
              Specialization: <strong>{activeModalTech.specialization}</strong> · Experience: <strong>{activeModalTech.experienceYears || 0} years</strong>
            </p>

            {/* Baseline metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
              <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, textAlign: 'center', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Rating</div>
                <div style={{ fontWeight: '700', fontSize: '1rem', color: '#0f172a' }}>⭐ {activeModalTech.averageRating || 4.5}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, textAlign: 'center', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Completed</div>
                <div style={{ fontWeight: '700', fontSize: '1rem', color: '#0f172a' }}>📋 {activeModalTech.completedJobs || activeModalTech.totalJobs || 0} jobs</div>
              </div>
              <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, textAlign: 'center', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Success Rate</div>
                <div style={{ fontWeight: '700', fontSize: '1rem', color: '#16a34a' }}>🎯 {activeModalTech.successRate || 98}%</div>
              </div>
              <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, textAlign: 'center', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Speed Ratio</div>
                <div style={{ fontWeight: '700', fontSize: '1rem', color: '#0284c7' }}>⚡ {Number(activeModalTech.historicalSpeedRatio || 1.0).toFixed(2)}x</div>
              </div>
              <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, textAlign: 'center', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Experience</div>
                <div style={{ fontWeight: '700', fontSize: '1rem', color: '#0f172a' }}>🛠️ {activeModalTech.experienceYears || 0} yrs</div>
              </div>
            </div>

            {/* Performance Matrix */}
            <h4 style={{ margin: '12px 0 6px', fontSize: '0.9rem', color: '#334155' }}>
              Multi-Vehicle & Service Performance Matrix
            </h4>

            {loadingModalMatrix ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>
                Evaluating model across vehicle and service matrices…
              </div>
            ) : modalMatrix ? (
              <div className="ai-matrix-wrapper">
                <table className="ai-matrix-table">
                  <thead>
                    <tr>
                      <th>Vehicle Type</th>
                      <th>Interior Service</th>
                      <th>Full Body Wash</th>
                      <th>Body Wash & Vacuum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['Car', 'Van', 'Cab'].map((v) => (
                      <tr key={v}>
                        <td style={{ fontWeight: '600' }}>{v === 'Car' ? '🚗 Car' : v === 'Van' ? '🚐 Van' : '🚖 Cab'}</td>
                        {['Interior', 'Full Body', 'Body Wash'].map((s) => {
                          const lvl = modalMatrix[v]?.[s] || 'MEDIUM';
                          return (
                            <td key={s}>
                              <span
                                className={`badge ${
                                  lvl === 'HIGH' ? 'badge-ai-high' : lvl === 'MEDIUM' ? 'badge-ai-medium' : 'badge-ai-low'
                                }`}
                              >
                                {lvl}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <button onClick={() => setActiveModalTech(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
