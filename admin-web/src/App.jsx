import React, { useCallback, useEffect, useState } from 'react';
import LoginForm from './components/LoginForm';
import ProtectedFeature from './components/ProtectedFeature';
import ServiceCenterManager from './components/ServiceCenterManager';
import PaymentManager from './components/PaymentManager';
import LoyaltyManager from './components/LoyaltyManager';
import { hasPermission, getAccessibleFeatures, getRoleDescription, ROLE_LABELS } from './utils/rolePermissions';
import {
  login as loginRequest,
  fetchServiceCenters,
  createServiceCenter,
  updateServiceCenter,
  fetchCustomerLoyalty
} from './services/api';

export default function App() {
  const [auth, setAuth] = useState(() => {
    const cached = window.localStorage.getItem('ssc_admin_session');
    return cached ? JSON.parse(cached) : null;
  });
  
  // Initialize active tab based on accessible features
  const [activeTab, setActiveTab] = useState(() => {
    const cached = window.localStorage.getItem('ssc_admin_session');
    if (cached) {
      const authData = JSON.parse(cached);
      const userRole = authData?.user?.role;
      const accessibleFeatures = getAccessibleFeatures(userRole);
      return accessibleFeatures.length > 0 ? accessibleFeatures[0] : 'centers';
    }
    return 'centers';
  });
  
  const [serviceCenters, setServiceCenters] = useState([]);
  
  // Payments සඳහා LocalStorage භාවිතය
  const [payments, setPayments] = useState(() => {
    const savedPayments = window.localStorage.getItem('ssc_admin_payments');
    if (savedPayments) {
      try { return JSON.parse(savedPayments); } catch (e) {}
    }
    return [
      {
        id: 1,
        customerName: 'John Smith',
        appointmentId: 'APT-001',
        amount: 129.99,
        paymentMethod: 'card',
        status: 'completed',
        description: 'Oil change + filter replacement',
        createdAt: new Date().toISOString(),
        date: new Date().toLocaleDateString()
      },
      {
        id: 2,
        customerName: 'Sarah Johnson',
        appointmentId: 'APT-002',
        amount: 249.50,
        paymentMethod: 'cash',
        status: 'completed',
        description: 'Brake service',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        date: new Date(Date.now() - 86400000).toLocaleDateString()
      },
      {
        id: 3,
        customerName: 'Mike Davis',
        appointmentId: 'APT-003',
        amount: 89.00,
        paymentMethod: 'online',
        status: 'pending',
        description: 'Diagnostic check',
        createdAt: new Date().toISOString(),
        date: new Date().toLocaleDateString()
      }
    ];
  });

  const [customerLoyalty, setCustomerLoyalty] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const token = auth?.token;
  const userRole = auth?.user?.role;

  const loadDashboard = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');
      
      const fetchPromises = [];
      
      if (hasPermission(userRole, 'serviceCenters')) {
        fetchPromises.push(
          fetchServiceCenters(token)
            .then(res => ({ type: 'centers', data: res.serviceCenters || [] }))
            .catch(err => {
              console.warn('Could not fetch service centers:', err.message);
              return { type: 'centers', data: [] };
            })
        );
      }
      
      if (hasPermission(userRole, 'customerLoyalty')) {
        fetchPromises.push(
          fetchCustomerLoyalty(token)
            .then(res => ({ type: 'loyalty', data: res.customers || [] }))
            .catch(err => {
              console.warn('Could not fetch loyalty data:', err.message);
              return { type: 'loyalty', data: [] };
            })
        );
      }
      
      const results = await Promise.all(fetchPromises);
      
      results.forEach(result => {
        if (result.type === 'centers') setServiceCenters(result.data);
        if (result.type === 'loyalty') setCustomerLoyalty(result.data);
      });
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, userRole]);

  useEffect(() => {
    if (token) {
      loadDashboard();
    }
  }, [token, userRole, loadDashboard]);

  const handleLogin = async (credentials) => {
    try {
      setLoading(true);
      setError('');
      const result = await loginRequest(credentials);
      setAuth(result);
      window.localStorage.setItem('ssc_admin_session', JSON.stringify(result));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceCenterCreate = async (payload, onSuccess) => {
    if (!token) return;
    try {
      setLoading(true);
      const { serviceCenter } = await createServiceCenter(payload, token);
      setServiceCenters((prev) => [serviceCenter, ...prev]);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceCenterUpdate = async (id, payload, onSuccess) => {
    if (!token) return;
    try {
      setLoading(true);
      const { serviceCenter } = await updateServiceCenter(id, payload, token);
      setServiceCenters((prev) =>
        prev.map((center) => (center.id === id ? serviceCenter : center))
      );
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentCreate = async (payload, onSuccess) => {
    if (!token) return;
    try {
      setLoading(true);
      const newPayment = {
        id: Date.now(),
        ...payload,
        createdAt: new Date().toISOString(),
        date: new Date().toLocaleDateString()
      };
      
      setPayments((prev) => {
        const updated = [newPayment, ...prev];
        window.localStorage.setItem('ssc_admin_payments', JSON.stringify(updated));
        return updated;
      });

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setAuth(null);
    setError('');
    window.localStorage.removeItem('ssc_admin_session');
  };

  if (!token) {
    return (
      <div className="auth-shell"> 
        <div>
          <h1>Service Center Admin</h1>
          <p>Monitor walk-ins, manage queues, and wrap repairs faster.</p>
        </div>
        {error && <div className="error">{error}</div>}
        <LoginForm onSubmit={handleLogin} loading={loading} />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>🚗 Service Center Admin</h1>
          <p className="muted">Manage services, inventory, and payments</p>
        </div>
        <div className="header-actions">
          <div className="user-info">
            <div className="user-badge">{auth.user.name}</div>
            <div className="role-badge" title={getRoleDescription(auth.user.role)}>
              {ROLE_LABELS[auth.user.role]}
            </div>
          </div>
          <button className="ghost" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <nav className="tab-nav">
        {hasPermission(auth.user.role, 'serviceCenters') && (
          <button
            className={`tab-button ${activeTab === 'centers' ? 'active' : ''}`}
            onClick={() => setActiveTab('centers')}
          >
            🏢 Service Centers
          </button>
        )}
        {hasPermission(auth.user.role, 'payments') && (
          <button
            className={`tab-button ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            💳 Payments
          </button>
        )}
        {hasPermission(auth.user.role, 'customerLoyalty') && (
          <button
            className={`tab-button ${activeTab === 'loyalty' ? 'active' : ''}`}
            onClick={() => setActiveTab('loyalty')}
          >
            🎯 Loyalty
          </button>
        )}
      </nav>

      <div className="tab-content">
        {activeTab === 'centers' && (
          <ProtectedFeature userRole={auth.user.role} feature="serviceCenters">
            <ServiceCenterManager
              serviceCenters={serviceCenters}
              onCreate={handleServiceCenterCreate}
              onUpdate={handleServiceCenterUpdate}
              loading={loading}
            />
          </ProtectedFeature>
        )}

        {activeTab === 'payments' && (
          <ProtectedFeature userRole={auth.user.role} feature="payments">
            <PaymentManager
              payments={payments}
              customers={customerLoyalty}
              token={token}
              onCreate={handlePaymentCreate}
              loading={loading}
            />
          </ProtectedFeature>
        )}

        {activeTab === 'loyalty' && (
          <ProtectedFeature userRole={auth.user.role} feature="customerLoyalty">
            <LoyaltyManager
              customers={customerLoyalty}
              loading={loading}
              onRefresh={loadDashboard}
              token={token}
            />
          </ProtectedFeature>
        )}
      </div>
    </div>
  );
}