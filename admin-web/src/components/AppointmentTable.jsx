import React from 'react';

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

export default function AppointmentTable({ appointments, onUpdate, updatingId }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3>Live queue</h3>
          <p className="muted">Update queue and service statuses in real time.</p>
        </div>
      </div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Customer</th>
              <th>Service</th>
              <th>Preferred slot</th>
              <th>Vehicle location</th>
              <th>Status</th>
              <th>Queue</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {appointments.length === 0 && (
              <tr>
                <td colSpan={8} className="empty">No appointments yet.</td>
              </tr>
            )}
            {appointments.map((appt) => (
              <tr key={appt.id}>
                <td>{appt.queueNumber}</td>
                <td>
                  <strong>{appt.customerName}</strong>
                  <div className="muted small">{appt.customerPhone || appt.customerEmail}</div>
                </td>
                <td>{appt.serviceName}</td>
                <td>
                  {appt.preferredDate}
                  <div className="muted small">{appt.preferredTime}</div>
                </td>
                <td>
                  {appt.vehicleLocation ? (
                    <>
                      <strong>{appt.vehicleLocation.label || 'Selected point'}</strong>
                      <div className="muted small">
                        {Number.isFinite(appt.vehicleLocation.latitude) && Number.isFinite(appt.vehicleLocation.longitude)
                          ? `${Number(appt.vehicleLocation.latitude).toFixed(6)}, ${Number(appt.vehicleLocation.longitude).toFixed(6)}`
                          : 'Location saved'}
                      </div>
                    </>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>
                  <select
                    value={appt.status}
                    onChange={(event) =>
                      onUpdate(appt.id, {
                        status: event.target.value,
                        queueStatus: appt.queueStatus
                      })
                    }
                  >
                    {serviceStatuses.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={appt.queueStatus}
                    onChange={(event) =>
                      onUpdate(appt.id, {
                        status: appt.status,
                        queueStatus: event.target.value
                      })
                    }
                  >
                    {queueStatuses.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    className="ghost"
                    onClick={() => onUpdate(appt.id, { status: 'completed', queueStatus: 'completed' })}
                    disabled={updatingId === appt.id || appt.status === 'completed'}
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
