import React, { useState, useEffect } from 'react';
import { fetchStaff, createStaff, deleteStaff } from '../services/api';

export default function StaffManager({ token, currentUser }) {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'cashier',
    password: 'Admin123!'
  });
  const [submitting, setSubmitting] = useState(false);

  const loadStaff = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');
      const res = await fetchStaff(token);
      setStaffList(res.staff || []);
    } catch (err) {
      setError(err.message || 'Failed to load staff members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!token) return;

    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      const res = await createStaff(form, token);
      setSuccess(res.message || 'Staff member added successfully!');
      setForm({
        name: '',
        email: '',
        role: 'cashier',
        password: 'Admin123!'
      });
      loadStaff();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to add staff member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, staffName) => {
    if (!window.confirm(`Are you sure you want to remove staff member "${staffName}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await deleteStaff(id, token);
      setSuccess(`Removed "${staffName}" from your service center staff.`);
      loadStaff();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to delete staff member');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role) => {
    const roleLower = (role || '').toLowerCase();
    const badges = {
      admin: { bg: '#fee2e2', text: '#991b1b', label: '👑 Admin' },
      manager: { bg: '#e0e7ff', text: '#3730a3', label: '📊 Manager' },
      supervisor: { bg: '#fef3c7', text: '#92400e', label: '🔍 Supervisor' },
      cashier: { bg: '#dcfce7', text: '#166534', label: '💳 Cashier' },
      receptionist: { bg: '#f3e8ff', text: '#6b21a8', label: '📋 Receptionist' }
    };

    const b = badges[roleLower] || { bg: '#f1f5f9', text: '#475569', label: role };
    return (
      <span style={{
        display: 'inline-block',
        padding: '0.3rem 0.65rem',
        borderRadius: '9999px',
        fontSize: '0.8rem',
        fontWeight: '600',
        backgroundColor: b.bg,
        color: b.text
      }}>
        {b.label}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2>👥 Service Center Staff Management</h2>
            <p className="muted">
              Register and manage staff accounts for this Service Center. Added staff can log in using their credentials and automatically appear on the Login screen shortcuts.
            </p>
          </div>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontWeight: '500',
            border: '1px solid #fecaca'
          }}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div style={{
            backgroundColor: '#dcfce7',
            color: '#166534',
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontWeight: '500',
            border: '1px solid #bbf7d0'
          }}>
            ✅ {success}
          </div>
        )}

        {/* Add Staff Form */}
        <form onSubmit={handleCreate} className="service-form" style={{ marginTop: '0.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: '#0f172a', marginBottom: '0.75rem' }}>
            ➕ Register New Staff Member
          </h3>

          <div className="form-grid">
            <label>
              Full Name *
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Sunil Perera"
                required
              />
            </label>

            <label>
              Staff Email *
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="e.g. sunil.matara@servicecenter.dev"
                required
              />
            </label>
          </div>

          <div className="form-grid">
            <label>
              Assigned Role (RBAC) *
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                  backgroundColor: '#fff',
                  cursor: 'pointer'
                }}
              >
                <option value="cashier">Cashier (Billing, Invoices & Payments)</option>
                <option value="manager">Manager (Inventory, Parts & Services)</option>
                <option value="supervisor">Supervisor (Queue, Appointments & Technicians)</option>
                <option value="receptionist">Receptionist (Front Desk & Customer Check-in)</option>
                <option value="admin">Administrator (Full Center Management)</option>
              </select>
            </label>

            <label>
              Login Password *
              <input
                name="password"
                type="text"
                value={form.password}
                onChange={handleChange}
                placeholder="Default: Admin123!"
                required
              />
            </label>
          </div>

          <div className="form-actions" style={{ marginTop: '0.75rem' }}>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Registering Staff…' : '💾 Register Staff Member'}
            </button>
          </div>
        </form>
      </div>

      {/* Staff List Table Card */}
      <div className="card">
        <div className="card-header" style={{ marginBottom: '1rem' }}>
          <div>
            <h3>Active Staff Members ({staffList.length})</h3>
            <p className="muted" style={{ fontSize: '0.875rem' }}>
              These accounts can sign into this Service Center with their designated permissions.
            </p>
          </div>
          <button 
            type="button" 
            onClick={loadStaff} 
            disabled={loading}
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.85rem',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            {loading ? 'Refreshing…' : '🔄 Refresh List'}
          </button>
        </div>

        {loading && staffList.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
            ⏳ Loading staff members...
          </p>
        ) : staffList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
            <p>No staff members found for this service center.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.875rem' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Email</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Role</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((member) => {
                  const isCurrent = currentUser?.email === member.email;
                  return (
                    <tr key={member.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: '600', color: '#1e293b' }}>
                        {member.name}
                        {isCurrent && (
                          <span style={{
                            marginLeft: '0.5rem',
                            fontSize: '0.75rem',
                            color: '#2563eb',
                            backgroundColor: '#eff6ff',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            (You)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontSize: '0.9rem' }}>
                        {member.email}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {getRoleBadge(member.role)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        {!isCurrent ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(member.id, member.name)}
                            disabled={loading}
                            style={{
                              padding: '0.35rem 0.7rem',
                              fontSize: '0.8rem',
                              backgroundColor: '#fee2e2',
                              color: '#991b1b',
                              border: '1px solid #fecaca',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            🗑️ Remove
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Protected</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
