import React, { useState } from 'react';

export default function TechnicianManager({ technicians, serviceCenters, onCreate, onUpdate, onDelete, loading }) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
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
      <div className="card-header">
        <div>
          <h2>🔧 Technician Management</h2>
          <p className="muted">Add technicians and assign them to service centers</p>
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
