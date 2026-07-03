import React, { useState } from 'react';

export default function LoginForm({ onSubmit, loading }) {
  const [email, setEmail] = useState('admin@servicecenter.dev');
  const [password, setPassword] = useState('Admin123!');
  const [selectedRole, setSelectedRole] = useState('admin');

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ email, password });
  };

  const demoAccounts = [
    { email: 'admin@servicecenter.dev', password: 'Admin123!', role: 'Admin' },
    { email: 'manager@servicecenter.dev', password: 'Manager123!', role: 'Manager' },
    { email: 'supervisor@servicecenter.dev', password: 'Supervisor123!', role: 'Supervisor' },
    { email: 'cashier@servicecenter.dev', password: 'Cashier123!', role: 'Cashier' },
    { email: 'receptionist@servicecenter.dev', password: 'Receptionist123!', role: 'Receptionist' }
  ];

  const handleDemoSelect = (account) => {
    setEmail(account.email);
    setPassword(account.password);
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>Service Center Admin Portal</h2>
      <p className="subtitle">Role-Based Access Control</p>
      
      <label>
        Email
        <input
          type="email"
          value={email}
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
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
          required
        />
      </label>
      <button type="submit" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>

      <div className="demo-accounts">
        <p className="demo-title">Demo Accounts by Role:</p>
        <div className="role-buttons">
          {demoAccounts.map((account) => (
            <button
              key={account.role}
              type="button"
              className="role-btn"
              onClick={() => handleDemoSelect(account)}
            >
              <span className="role-label">{account.role}</span>
              <span className="role-email">{account.email}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="role-info">
        <h3>Role Permissions:</h3>
        <ul>
          <li><strong>Admin:</strong> Full access to all dashboard features</li>
          <li><strong>Manager:</strong> Manage inventory &amp; view income analysis</li>
          <li><strong>Supervisor:</strong> Assign technicians &amp; manage appointments</li>
          <li><strong>Cashier:</strong> View and process payments</li>
          <li><strong>Receptionist:</strong> Manage appointments &amp; customer information</li>
        </ul>
      </div>
    </form>
  );
}
