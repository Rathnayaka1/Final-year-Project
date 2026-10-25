import React, { useState } from 'react';

const queueStatuses = [
  { value: 'waiting', label: 'Waiting' },
  { value: 'called', label: 'Called' },
  { value: 'serving', label: 'Serving' },
  { value: 'completed', label: 'Completed' },
  { value: 'skipped', label: 'Skipped' }
];

const serviceStatuses = [
  { value: 'booked', label: 'Booked' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
];

const todayStr = new Date().toISOString().split('T')[0];

export default function AppointmentTable({ appointments, onUpdate, updatingId, technicians = [], customers = [] }) {
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [customDate, setCustomDate] = useState(todayStr);
  const [statusFilter, setStatusFilter] = useState('all');

  // Build technician id→name map
  const techMap = {};
  technicians.forEach((t) => { techMap[t.id || t._id] = t.name; });

  // Build customer id / phone / name -> email map for fallback
  const custEmailMap = {};
  customers.forEach((c) => {
    const id = (c.id || c._id)?.toString();
    if (id && c.email) custEmailMap[id] = c.email;
    if (c.phone && c.email) custEmailMap[c.phone] = c.email;
    if (c.name && c.email) custEmailMap[c.name.toLowerCase()] = c.email;
  });

  const getCustomerEmail = (appt) => {
    if (appt.customerEmail) return appt.customerEmail;
    if (appt.customer) {
      if (typeof appt.customer === 'object' && appt.customer.email) return appt.customer.email;
      const cid = (appt.customer.id || appt.customer._id || appt.customer)?.toString();
      if (cid && custEmailMap[cid]) return custEmailMap[cid];
    }
    if (appt.customerPhone && custEmailMap[appt.customerPhone]) return custEmailMap[appt.customerPhone];
    if (appt.customerName && custEmailMap[appt.customerName.toLowerCase()]) return custEmailMap[appt.customerName.toLowerCase()];
    return '';
  };

  // --- Filter logic (AND) ---
  const filtered = appointments.filter((appt) => {
    const custEmail = getCustomerEmail(appt);
    // 1. Search filter
    const q = search.toLowerCase();
    const matchSearch = !q ||
      appt.customerName?.toLowerCase().includes(q) ||
      appt.confirmationCode?.toLowerCase().includes(q) ||
      appt.customerPhone?.includes(q) ||
      custEmail?.toLowerCase().includes(q) ||
      appt.serviceName?.toLowerCase().includes(q);

    // 2. Date filter
    let matchDate = true;
    if (dateFilter === 'today') {
      matchDate = appt.preferredDate === todayStr;
    } else if (dateFilter === 'custom') {
      matchDate = appt.preferredDate === customDate;
    }
    // dateFilter === 'all' → matchDate stays true

    // 3. Status filter
    let matchStatus = true;
    if (statusFilter === 'active') {
      matchStatus = appt.status === 'booked' || appt.status === 'in_progress';
    } else if (statusFilter !== 'all') {
      matchStatus = appt.status === statusFilter;
    }

    return matchSearch && matchDate && matchStatus;
  });

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3>Live queue</h3>
          <p className="muted">Update queue and service statuses in real time.</p>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div style={{
        padding: '0.85rem 1.5rem',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex', flexWrap: 'wrap', gap: '0.65rem', alignItems: 'center'
      }}>
        {/* Search */}
        <input
          type="search"
          placeholder="🔍 Name / Code / Phone / Email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={inputSt}
        />

        {/* Date quick-select */}
        <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={inputSt}>
          <option value="today">📅 Today</option>
          <option value="custom">📆 Pick date</option>
          <option value="all">All dates</option>
        </select>

        {dateFilter === 'custom' && (
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            style={inputSt}
          />
        )}

        {/* Status filter */}
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputSt}>
          <option value="active">🟢 Active (booked + in progress)</option>
          <option value="all">All statuses</option>
          {serviceStatuses.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#64748b' }}>
          {filtered.length} / {appointments.length} shown
        </span>
      </div>

      {/* ── Table ── */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Customer</th>
              <th>Service</th>
              <th>Date &amp; Time</th>
              <th>Technician</th>
              <th>Status</th>
              <th>Queue</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="empty">
                  No appointments match the selected filters.
                </td>
              </tr>
            )}
            {filtered.map((appt) => (
              <tr key={appt.id}>
                <td>{appt.queueNumber}</td>
                <td>
                  <strong>{appt.customerName}</strong>
                  {getCustomerEmail(appt) && (
                    <div className="muted small" style={{ wordBreak: 'break-all' }}>
                      {getCustomerEmail(appt)}
                    </div>
                  )}
                  {appt.customerPhone && (
                    <div className="muted small">{appt.customerPhone}</div>
                  )}
                  {!getCustomerEmail(appt) && !appt.customerPhone && (
                    <div className="muted small">—</div>
                  )}
                </td>
                <td>{appt.serviceName}</td>
                <td>
                  <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>{appt.preferredDate || '—'}</div>
                  <div className="muted small">{appt.preferredTime || ''}</div>
                </td>
                <td>
                  {appt.technician
                    ? (techMap[appt.technician] || appt.technician)
                    : <span className="muted small">Unassigned</span>}
                </td>
                <td>
                  <select
                    value={appt.status}
                    onChange={(e) => onUpdate(appt.id, { status: e.target.value, queueStatus: appt.queueStatus })}
                  >
                    {serviceStatuses.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={appt.queueStatus}
                    onChange={(e) => onUpdate(appt.id, { status: appt.status, queueStatus: e.target.value })}
                  >
                    {queueStatuses.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    className="ghost"
                    onClick={() => onUpdate(appt.id, { status: 'completed', queueStatus: 'completed' })}
                    disabled={updatingId === appt.id || apptsame(appt)}
                  >
                    {apptsame(appt) ? 'Completed' : 'Mark completed'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function apptsame(appt) {
  return appt.status === 'completed' && appt.queueStatus === 'completed';
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
