import React, { useCallback, useEffect, useState } from 'react';
import LoginForm from './components/LoginForm';
import ProtectedFeature from './components/ProtectedFeature';
import ServiceCenterManager from './components/ServiceCenterManager';
import PaymentManager from './components/PaymentManager';
import LoyaltyManager from './components/LoyaltyManager';
import ServiceManager from './components/ServiceManager';
import StockManager from './components/StockManager';
import AppointmentTable from './components/AppointmentTable';
import TechnicianManager from './components/TechnicianManager';

import { hasPermission, getAccessibleFeatures, getRoleDescription, ROLE_LABELS } from './utils/rolePermissions';
import {
  login as loginRequest,
  registerServiceCenter,
  fetchServiceCenters,
  createServiceCenter,
  updateServiceCenter,
  fetchCustomerLoyalty,
  earnLoyaltyPoints,
  fetchServices,
  createService,
  updateService,
  deleteService,
  fetchStocks,
  createStock,
  updateStock,
  deleteStock,
  fetchAppointments,
  updateAppointment,
  fetchTechnicians,
  createTechnician,
  updateTechnician,
  deleteTechnician,
  fetchPayments,
  createPaymentRecord,
  updatePaymentRecord,
  deletePaymentRecord
} from './services/api';

function featureToTab(feature) {
  if (feature === 'serviceCenters') return 'centers';
  if (feature === 'customerLoyalty') return 'loyalty';
  return feature || 'centers';
}

function getDefaultTabForRole(role) {
  const accessibleFeatures = getAccessibleFeatures(role);
  if (!accessibleFeatures || accessibleFeatures.length === 0) return 'centers';
  return featureToTab(accessibleFeatures[0]);
}

export default function App() {
  const [auth, setAuth] = useState(() => {
    const cached = window.localStorage.getItem('ssc_admin_session');
    return cached ? JSON.parse(cached) : null;
  });

  // Initialize active tab based on accessible features or saved preference
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = window.localStorage.getItem('ssc_active_tab');
    const validTabs = ['centers', 'services', 'stocks', 'appointments', 'technicians', 'payments', 'loyalty'];
    if (savedTab && validTabs.includes(savedTab)) {
      return savedTab;
    }
    const cached = window.localStorage.getItem('ssc_admin_session');
    if (cached) {
      try {
        const authData = JSON.parse(cached);
        const userRole = authData?.user?.role;
        return getDefaultTabForRole(userRole);
      } catch (e) {
        return 'centers';
      }
    }
    return 'centers';
  });

  const handleTabChange = (tab) => {
    const target = featureToTab(tab);
    setActiveTab(target);
    window.localStorage.setItem('ssc_active_tab', target);
  };

  // Auto-correct any legacy or unmapped tab names so user never sees a blank page
  useEffect(() => {
    if (activeTab === 'serviceCenters') {
      setActiveTab('centers');
      window.localStorage.setItem('ssc_active_tab', 'centers');
    } else if (activeTab === 'customerLoyalty') {
      setActiveTab('loyalty');
      window.localStorage.setItem('ssc_active_tab', 'loyalty');
    }
  }, [activeTab]);

  const [serviceCenters, setServiceCenters] = useState([]);
  const [services, setServices] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [technicians, setTechnicians] = useState([]);

  const [payments, setPayments] = useState([]);

  const [customerLoyalty, setCustomerLoyalty] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState(null);
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

      if (hasPermission(userRole, 'services')) {
        fetchPromises.push(
          fetchServices(token)
            .then(res => ({ type: 'services', data: res.services || res || [] }))
            .catch(err => {
              console.warn('Could not fetch services:', err.message);
              return { type: 'services', data: [] };
            })
        );
      }

      if (hasPermission(userRole, 'stocks')) {
        fetchPromises.push(
          fetchStocks(token)
            .then(res => ({ type: 'stocks', data: res.stocks || res || [] }))
            .catch(err => {
              console.warn('Could not fetch stocks:', err.message);
              return { type: 'stocks', data: [] };
            })
        );
      }

      if (hasPermission(userRole, 'appointments')) {
        fetchPromises.push(
          fetchAppointments(token)
            .then(res => ({ type: 'appointments', data: res.appointments || res || [] }))
            .catch(err => {
              console.warn('Could not fetch appointments:', err.message);
              return { type: 'appointments', data: [] };
            })
        );
      }

      if (hasPermission(userRole, 'technicians')) {
        fetchPromises.push(
          fetchTechnicians(token)
            .then(res => ({ type: 'technicians', data: res.technicians || res || [] }))
            .catch(err => {
              console.warn('Could not fetch technicians:', err.message);
              return { type: 'technicians', data: [] };
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

      if (hasPermission(userRole, 'payments')) {
        fetchPromises.push(
          fetchPayments(token)
            .then(res => ({ type: 'payments', data: res.payments || [] }))
            .catch(err => {
              console.warn('Could not fetch payments from backend:', err.message);
              return { type: 'payments', data: null };
            })
        );
      }

      const results = await Promise.all(fetchPromises);

      results.forEach(result => {
        if (result.type === 'centers') setServiceCenters(result.data);
        if (result.type === 'services') setServices(Array.isArray(result.data) ? result.data : []);
        if (result.type === 'stocks') setStocks(Array.isArray(result.data) ? result.data : []);
        if (result.type === 'appointments') setAppointments(Array.isArray(result.data) ? result.data : []);
        if (result.type === 'technicians') setTechnicians(Array.isArray(result.data) ? result.data : []);
        if (result.type === 'loyalty') setCustomerLoyalty(result.data);
        if (result.type === 'payments' && Array.isArray(result.data)) {
          setPayments(result.data);
        }
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
      // Reset activeTab to new user's first accessible feature
      const newRole = result?.user?.role;
      const firstTab = getDefaultTabForRole(newRole);
      handleTabChange(firstTab);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterCenter = async (registrationData) => {
    try {
      setLoading(true);
      setError('');
      const result = await registerServiceCenter(registrationData);
      setAuth(result);
      window.localStorage.setItem('ssc_admin_session', JSON.stringify(result));
      const firstTab = getDefaultTabForRole(result?.user?.role);
      handleTabChange(firstTab);
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
      if (onSuccess) onSuccess();
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
      if (payload.name && auth?.user?.serviceCenter === id) {
        setAuth((prev) => {
          const updated = {
            ...prev,
            user: { ...prev.user, serviceCenterName: payload.name }
          };
          window.localStorage.setItem('ssc_admin_session', JSON.stringify(updated));
          return updated;
        });
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Service CRUD handlers
  const handleServiceCreate = async (payload, onSuccess) => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await createService(payload, token);
      const newService = res.service || res;
      setServices((prev) => [newService, ...prev]);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceUpdate = async (id, payload, onSuccess) => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await updateService(id, payload, token);
      const updated = res.service || res;
      setServices((prev) => prev.map((s) => (s.id === id ? updated : s)));
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceDelete = async (id) => {
    if (!token) return;
    try {
      setLoading(true);
      await deleteService(id, token);
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Stock CRUD handlers
  const handleStockCreate = async (payload, onSuccess) => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await createStock(payload, token);
      const newStock = res.stock || res;
      setStocks((prev) => [newStock, ...prev]);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStockUpdate = async (id, payload, onSuccess) => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await updateStock(id, payload, token);
      const updated = res.stock || res;
      setStocks((prev) => prev.map((s) => (s.id === id ? updated : s)));
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStockDelete = async (id) => {
    if (!token) return;
    try {
      setLoading(true);
      await deleteStock(id, token);
      setStocks((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Appointment handler
  const handleAppointmentUpdate = async (id, payload) => {
    if (!token) return;
    try {
      setUpdatingAppointmentId(id);
      const res = await updateAppointment(id, payload, token);
      const updated = res.appointment || res;
      setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingAppointmentId(null);
    }
  };

  // Technician CRUD handlers
  const handleTechnicianCreate = async (payload, onSuccess) => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await createTechnician(payload, token);
      const newTech = res.technician || res;
      setTechnicians((prev) => [newTech, ...prev]);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTechnicianUpdate = async (id, payload, onSuccess) => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await updateTechnician(id, payload, token);
      const updated = res.technician || res;
      setTechnicians((prev) => prev.map((t) => (t.id === id ? updated : t)));
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTechnicianDelete = async (id) => {
    if (!token) return;
    try {
      setLoading(true);
      await deleteTechnician(id, token);
      setTechnicians((prev) => prev.filter((t) => t.id !== id));
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
      let newPayment;
      try {
        const res = await createPaymentRecord(payload, token);
        newPayment = res.payment || res;
      } catch (apiErr) {
        console.warn('Backend payment save failed, using local fallback:', apiErr.message);
        newPayment = {
          id: Date.now(),
          ...payload,
          createdAt: new Date().toISOString(),
          date: new Date().toLocaleDateString()
        };
      }

      setPayments((prev) => [newPayment, ...prev.filter(p => (p.id || p._id) !== (newPayment.id || newPayment._id))]);

      // Earn loyalty points for customer if customerId is selected
      if (payload.customerId) {
        const amountForPoints = Number(payload.subtotal || payload.amount || 0);
        const pointsToAdd = Math.floor(amountForPoints / 1000);

        if (pointsToAdd > 0 && (!payload.discount || payload.discount === 0)) {
          try {
            await earnLoyaltyPoints(
              payload.customerId,
              pointsToAdd,
              `Earned ${pointsToAdd} points from bill payment`,
              token
            );
          } catch (e) {
            console.warn('Could not auto-add loyalty points:', e);
          }
        }
        // Reload dashboard so loyalty CRUD immediately reflects updated points
        await loadDashboard();
      }

      if (onSuccess) onSuccess();
      // Reload dashboard so stock count, appointments and loyalty points are up to date
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentUpdate = async (id, payload, onSuccess) => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await updatePaymentRecord(id, payload, token);
      const updatedPayment = res.payment || res;
      setPayments((prev) => prev.map(p => ((p.id || p._id) === id ? { ...p, ...updatedPayment } : p)));
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentDelete = async (id) => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to delete this payment record?')) return;
    try {
      setLoading(true);
      await deletePaymentRecord(id, token);
      setPayments((prev) => prev.filter(p => (p.id || p._id) !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setAuth(null);
    setPayments([]);
    setError('');
    window.localStorage.removeItem('ssc_admin_session');
    window.localStorage.removeItem('ssc_admin_payments');
    window.localStorage.removeItem('ssc_active_tab');
  };

  if (!token) {
    return (
      <div className="auth-shell">
        <div>
          <h1>Service Center Admin</h1>
          <p>Monitor walk-ins, manage queues, and wrap repairs faster.</p>
        </div>
        {error && <div className="error">{error}</div>}
        <LoginForm onSubmit={handleLogin} onRegister={handleRegisterCenter} loading={loading} />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>🚗 {auth.user.serviceCenterName || 'Service Center Admin'}</h1>
          <p className="muted">
            {auth.user.serviceCenterName
              ? `Workspace scoped to ${auth.user.serviceCenterName} — inventory, queues & staff isolated`
              : 'Manage services, inventory, appointments, technicians and payments'}
          </p>
        </div>
        <div className="header-actions">
          <div className="user-info">
            <div className="user-badge">{auth.user.name}</div>
            {auth.user.serviceCenterName && (
              <div
                className="center-badge"
                style={{
                  background: '#e0f2fe',
                  color: '#0369a1',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  border: '1px solid #bae6fd'
                }}
              >
                🏢 {auth.user.serviceCenterName}
              </div>
            )}
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
            onClick={() => handleTabChange('centers')}
          >
            🏢 Center Registration
          </button>
        )}
        {hasPermission(auth.user.role, 'services') && (
          <button
            className={`tab-button ${activeTab === 'services' ? 'active' : ''}`}
            onClick={() => handleTabChange('services')}
          >
            🛠️ Services
          </button>
        )}
        {hasPermission(auth.user.role, 'stocks') && (
          <button
            className={`tab-button ${activeTab === 'stocks' ? 'active' : ''}`}
            onClick={() => handleTabChange('stocks')}
          >
            📦 Inventory
          </button>
        )}
        {hasPermission(auth.user.role, 'appointments') && (
          <button
            className={`tab-button ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => handleTabChange('appointments')}
          >
            📅 Appointments
          </button>
        )}
        {hasPermission(auth.user.role, 'technicians') && (
          <button
            className={`tab-button ${activeTab === 'technicians' ? 'active' : ''}`}
            onClick={() => handleTabChange('technicians')}
          >
            👨‍🔧 Technicians
          </button>
        )}
        {hasPermission(auth.user.role, 'payments') && (
          <button
            className={`tab-button ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => handleTabChange('payments')}
          >
            💳 Payments
          </button>
        )}
        {hasPermission(auth.user.role, 'customerLoyalty') && (
          <button
            className={`tab-button ${activeTab === 'loyalty' ? 'active' : ''}`}
            onClick={() => handleTabChange('loyalty')}
          >
            🎯 Loyalty
          </button>
        )}
      </nav>

      <div className="tab-content">
        {activeTab === 'services' && (
          <ProtectedFeature userRole={auth.user.role} feature="services">
            <ServiceManager
              services={services}
              onCreate={handleServiceCreate}
              onUpdate={handleServiceUpdate}
              onDelete={handleServiceDelete}
              loading={loading}
            />
          </ProtectedFeature>
        )}

        {activeTab === 'stocks' && (
          <ProtectedFeature userRole={auth.user.role} feature="stocks">
            <StockManager
              token={token}
              stocks={stocks}
              onCreate={handleStockCreate}
              onUpdate={handleStockUpdate}
              onDelete={handleStockDelete}
              loading={loading}
            />
          </ProtectedFeature>
        )}

        {activeTab === 'appointments' && (
          <ProtectedFeature userRole={auth.user.role} feature="appointments">
            <AppointmentTable
              appointments={appointments}
              onUpdate={handleAppointmentUpdate}
              updatingId={updatingAppointmentId}
            />
          </ProtectedFeature>
        )}

        {activeTab === 'technicians' && (
          <ProtectedFeature userRole={auth.user.role} feature="technicians">
            <TechnicianManager
              token={token}
              technicians={technicians}
              onCreate={handleTechnicianCreate}
              onUpdate={handleTechnicianUpdate}
              onDelete={handleTechnicianDelete}
              loading={loading}
            />
          </ProtectedFeature>
        )}

        {activeTab === 'centers' && (
          <ProtectedFeature userRole={auth.user.role} feature="serviceCenters">
            <ServiceCenterManager
              serviceCenters={serviceCenters}
              currentCenterId={auth?.user?.serviceCenter}
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
              appointments={appointments}
              stocks={stocks}
              services={services}
              token={token}
              onCreate={handlePaymentCreate}
              onUpdate={handlePaymentUpdate}
              onDelete={handlePaymentDelete}
              loading={loading}
              userRole={auth.user.role}
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
