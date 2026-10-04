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
import TechnicianPerformance from './components/TechnicianPerformance';

import { hasPermission, getAccessibleFeatures, getRoleDescription, ROLE_LABELS } from './utils/rolePermissions';
import {
  login as loginRequest,
  fetchServiceCenters,
  createServiceCenter,
  updateServiceCenter,
  fetchCustomerLoyalty,
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
  deleteTechnician
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
      return accessibleFeatures.length > 0 ? accessibleFeatures[0] : 'services';
    }
    return 'services';
  });
  
  const [serviceCenters, setServiceCenters] = useState([]);
  const [services, setServices] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  
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
      
      const results = await Promise.all(fetchPromises);
      
      results.forEach(result => {
        if (result.type === 'centers') setServiceCenters(result.data);
        if (result.type === 'services') setServices(Array.isArray(result.data) ? result.data : []);
        if (result.type === 'stocks') setStocks(Array.isArray(result.data) ? result.data : []);
        if (result.type === 'appointments') setAppointments(Array.isArray(result.data) ? result.data : []);
        if (result.type === 'technicians') setTechnicians(Array.isArray(result.data) ? result.data : []);
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

      if (onSuccess) onSuccess();
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
          <p className="muted">Manage services, inventory, appointments, technicians and payments</p>
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
        {hasPermission(auth.user.role, 'services') && (
          <button
            className={`tab-button ${activeTab === 'services' ? 'active' : ''}`}
            onClick={() => setActiveTab('services')}
          >
            🛠️ Services
          </button>
        )}
        {hasPermission(auth.user.role, 'stocks') && (
          <button
            className={`tab-button ${activeTab === 'stocks' ? 'active' : ''}`}
            onClick={() => setActiveTab('stocks')}
          >
            📦 Inventory
          </button>
        )}
        {hasPermission(auth.user.role, 'appointments') && (
          <button
            className={`tab-button ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => setActiveTab('appointments')}
          >
            📅 Appointments
          </button>
        )}
        {hasPermission(auth.user.role, 'technicians') && (
          <button
            className={`tab-button ${activeTab === 'technicians' ? 'active' : ''}`}
            onClick={() => setActiveTab('technicians')}
          >
            👨‍🔧 Technicians
          </button>
        )}
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
        {hasPermission(auth.user.role, 'technicianPerformance') && (
          <button
            className={`tab-button ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            🤖 ML Prediction
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
              technicians={technicians}
              serviceCenters={serviceCenters}
              onCreate={handleTechnicianCreate}
              onUpdate={handleTechnicianUpdate}
              onDelete={handleTechnicianDelete}
              loading={loading}
              token={token}
            />
          </ProtectedFeature>
        )}

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

        {activeTab === 'performance' && (
          <ProtectedFeature userRole={auth.user.role} feature="technicianPerformance">
            <TechnicianPerformance token={auth?.token} userRole={auth?.user?.role} />
          </ProtectedFeature>
        )}
      </div>
    </div>
  );
}
