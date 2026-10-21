import React, { useState, useEffect } from 'react';
import { fetchPublicCenters } from '../services/api';

export default function LoginForm({ onSubmit, onRegister, loading }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [centerName, setCenterName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('admin@servicecenter.dev');
  const [password, setPassword] = useState('Admin123!');

  // Service Centers from database for the dropdown
  const [availableCenters, setAvailableCenters] = useState([
    { id: 'downtown', name: 'Downtown Service Center' },
    { id: 'westside', name: 'Westside Auto Care' }
  ]);
  const [selectedCenterId, setSelectedCenterId] = useState('downtown');

  useEffect(() => {
    fetchPublicCenters()
      .then((res) => {
        if (res.serviceCenters && res.serviceCenters.length > 0) {
          setAvailableCenters(res.serviceCenters);
        }
      })
      .catch((err) => {
        console.warn('Could not load public centers:', err.message);
      });
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isRegistering) {
      if (!onRegister) return;
      onRegister({
        centerName: centerName.trim(),
        name: adminName.trim(),
        email: email.trim(),
        password: password.trim()
      });
    } else {
      onSubmit({ email, password });
    }
  };

  const downtownAccounts = [
    { email: 'admin@servicecenter.dev', password: 'Admin123!', role: 'Admin' },
    { email: 'manager@servicecenter.dev', password: 'Manager123!', role: 'Manager' },
    { email: 'supervisor@servicecenter.dev', password: 'Supervisor123!', role: 'Supervisor' },
    { email: 'cashier@servicecenter.dev', password: 'Cashier123!', role: 'Cashier' },
    { email: 'receptionist@servicecenter.dev', password: 'Receptionist123!', role: 'Receptionist' }
  ];

  const westsideAccounts = [
    { email: 'admin.westside@servicecenter.dev', password: 'Admin123!', role: 'Admin' },
    { email: 'manager.westside@servicecenter.dev', password: 'Manager123!', role: 'Manager' },
    { email: 'supervisor.westside@servicecenter.dev', password: 'Supervisor123!', role: 'Supervisor' },
    { email: 'cashier.westside@servicecenter.dev', password: 'Cashier123!', role: 'Cashier' },
    { email: 'receptionist.westside@servicecenter.dev', password: 'Receptionist123!', role: 'Receptionist' }
  ];

  const handleCenterDropdownChange = (e) => {
    const chosenId = e.target.value;
    setSelectedCenterId(chosenId);

    const chosenCenter = availableCenters.find((c) => c.id === chosenId);
    const centerNameLower = (chosenCenter?.name || '').toLowerCase();

    if (centerNameLower.includes('westside')) {
      setEmail(westsideAccounts[0].email);
      setPassword(westsideAccounts[0].password);
    } else if (centerNameLower.includes('downtown')) {
      setEmail(downtownAccounts[0].email);
      setPassword(downtownAccounts[0].password);
    } else {
      // Custom registered center (like Autohub)
      setEmail('');
      setPassword('');
    }
  };

  const handleDemoSelect = (account) => {
    setEmail(account.email);
    setPassword(account.password);
  };

  const selectedCenter = availableCenters.find((c) => c.id === selectedCenterId);
  const selectedCenterName = selectedCenter?.name || 'Downtown Service Center';
  const isWestside = selectedCenterName.toLowerCase().includes('westside');
  const isDowntown = selectedCenterName.toLowerCase().includes('downtown');
  const quickAccounts = isWestside ? westsideAccounts : isDowntown ? downtownAccounts : [];

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>{isRegistering ? 'Sign Up' : 'Service Center Admin Portal'}</h2>
      <p className="subtitle">
        {isRegistering
          ? 'Create your Service Center account'
          : 'Multi-Tenant Service Center Management'}
      </p>

      {/* Mode Switch Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={() => {
            setIsRegistering(false);
            setEmail('admin@servicecenter.dev');
            setPassword('Admin123!');
          }}
          style={{
            flex: 1,
            padding: '0.6rem',
            borderRadius: '6px',
            border: !isRegistering ? '2px solid #2563eb' : '1px solid #cbd5e1',
            background: !isRegistering ? '#eff6ff' : '#fff',
            color: !isRegistering ? '#1d4ed8' : '#64748b',
            fontWeight: !isRegistering ? 'bold' : 'normal',
            cursor: 'pointer'
          }}
        >
          🔐 Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setIsRegistering(true);
            setEmail('');
            setPassword('');
          }}
          style={{
            flex: 1,
            padding: '0.6rem',
            borderRadius: '6px',
            border: isRegistering ? '2px solid #2563eb' : '1px solid #cbd5e1',
            background: isRegistering ? '#eff6ff' : '#fff',
            color: isRegistering ? '#1d4ed8' : '#64748b',
            fontWeight: isRegistering ? 'bold' : 'normal',
            cursor: 'pointer'
          }}
        >
          📝 Sign Up
        </button>
      </div>

      {isRegistering ? (
        <>
          <label>
            Service Center Name
            <input
              type="text"
              placeholder="e.g. Kandy Auto Hub"
              value={centerName}
              onChange={(e) => setCenterName(e.target.value)}
              required
            />
          </label>
          <label>
            Admin Name
            <input
              type="text"
              placeholder="e.g. Kasun Perera"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              required
            />
          </label>
          <label>
            Admin Email
            <input
              type="email"
              placeholder="admin@kandyauto.com"
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              placeholder="Create a strong password"
              value={password}
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button type="submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Signing up…' : 'Sign Up'}
          </button>
        </>
      ) : (
        <>
          {/* Dropdown for Selecting Service Center */}
          <label style={{ marginBottom: '1.25rem' }}>
            Select Service Center
            <select
              value={selectedCenterId}
              onChange={handleCenterDropdownChange}
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                border: '2px solid #e2e8f0',
                fontSize: '1rem',
                fontWeight: '500',
                color: '#1e293b',
                backgroundColor: '#f8fafc',
                cursor: 'pointer',
                marginTop: '0.5rem',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}
            >
              {availableCenters.map((center) => (
                <option key={center.id} value={center.id}>
                  🏢 {center.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Email
            <input
              type="email"
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          {/* Quick Demo Sign-in for pre-seeded centers */}
          {quickAccounts.length > 0 && (
            <div className="demo-accounts" style={{ marginTop: '1.25rem' }}>
              <p className="demo-title" style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>
                Quick Demo Sign-In ({selectedCenterName}):
              </p>
              <div className="role-buttons">
                {quickAccounts.map((account) => (
                  <button
                    key={account.role}
                    type="button"
                    className={`role-btn ${email === account.email ? 'active-role' : ''}`}
                    onClick={() => handleDemoSelect(account)}
                  >
                    <span className="role-label">{account.role}</span>
                    <span className="role-email">{account.email}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="role-info" style={{ marginTop: '1.25rem', fontSize: '0.85rem' }}>
        <h3 style={{ fontSize: '0.95rem', marginBottom: '0.25rem' }}>Multi-Tenant Architecture:</h3>
        <p style={{ margin: '0 0 0.5rem 0', color: '#64748b' }}>
          Each Service Center operates in its own isolated workspace with separate services, inventory, queues, and revenue.
        </p>
      </div>
    </form>
  );
}
