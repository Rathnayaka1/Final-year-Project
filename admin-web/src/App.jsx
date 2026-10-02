import React, { useCallback, useEffect, useState } from 'react';
import LoginForm from './components/LoginForm';
import ProtectedFeature from './components/ProtectedFeature';
import ServiceManager from './components/ServiceManager';
import ServiceCenterManager from './components/ServiceCenterManager';
import StockManager from './components/StockManager';
import PaymentManager from './components/PaymentManager';
import AppointmentTable from './components/AppointmentTable';
import LoyaltyManager from './components/LoyaltyManager';
import TechnicianManager from './components/TechnicianManager';
import { hasPermission, getAccessibleFeatures, getRoleDescription, ROLE_LABELS } from './utils/rolePermissions';
import {
  login as loginRequest,
  fetchServices,
  createService,
  updateService,
  fetchServiceCenters,
  createServiceCenter,
  updateServiceCenter,
  fetchCustomerLoyalty,
  fetchTechnicians,
  createTechnician,
  updateTechnician,
  deleteTechnician,
  fetchAppointments,
  updateAppointment
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
  
  const [services, setServices] = useState([]);
  const [serviceCenters, setServiceCenters] = useState([]);
  
  // Stocks සඳහා LocalStorage භාවිතය
  const [stocks, setStocks] = useState(() => {
    const savedStocks = window.localStorage.getItem('ssc_admin_stocks');
    if (savedStocks) {
      try { return JSON.parse(savedStocks); } catch (e) {}
    }
    return [
      {
        id: 1,
        partName: 'Engine Oil Filter',
        partNumber: 'EOF-1234',
        quantity: 45,
        minQuantity: 20,
        unitPrice: 12.99,
        supplier: 'AutoParts Inc'
      },
      {
        id: 2,
        partName: 'Brake Pads',
        partNumber: 'BP-5678',
        quantity: 8,
        minQuantity: 15,
        unitPrice: 49.99,
        supplier: 'Brake Masters'
      },
      {
        id: 3,
        partName: 'Air Filter',
        partNumber: 'AF-9012',
        quantity: 0,
        minQuantity: 10,
        unitPrice: 18.50,
        supplier: 'Filter Depot'
      }
    ];
  });

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

  const [appointments, setAppointments] = useState([]);
  const [customerLoyalty, setCustomerLoyalty] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const token = auth?.token;
  const userRole = auth?.user?.role;

  const loadDashboard = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');
      
      const fetchPromises = [];
      
      if (hasPermission(userRole, 'services')) {
        fetchPromises.push(
          fetchServices(token)
            .then(res => ({ type: 'services', data: res.services }))
            .catch(err => { 
              console.warn('Could not fetch services:', err.message);
              return { type: 'services', data: [] }; 
            })
        );
      }
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
      
      if (hasPermission(userRole, 'appointments')) {
        fetchPromises.push(
          fetchAppointments(token)
            .then(res => ({ type: 'appointments', data: res.appointments }))
            .catch(err => {
              console.warn('Could not fetch appointments:', err.message);
              return { type: 'appointments', data: [] };
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
      
      if (hasPermission(userRole, 'technicians')) {
        fetchPromises.push(
          fetchTechnicians(token)
            .then(res => ({ type: 'technicians', data: res.technicians || [] }))
            .catch(err => {
              console.warn('Could not fetch technicians:', err.message);
              return { type: 'technicians', data: [] };
            })
        );
      }

      const results = await Promise.all(fetchPromises);
      
      results.forEach(result => {
        if (result.type === 'services') setServices(result.data);
        if (result.type === 'centers') setServiceCenters(result.data);
        if (result.type === 'appointments') setAppointments(result.data);
        if (result.type === 'loyalty') setCustomerLoyalty(result.data);
        if (result.type === 'technicians') setTechnicians(result.data);
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
    } else {
      fetchServices()
        .then((payload) => setServices(payload.services))
        .catch(() => {});
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

  const handleServiceCreate = async (payload, onSuccess) => {
    if (!token) return;
    try {
      setLoading(true);
      const { service } = await createService(payload, token);
      setServices((prev) => [service, ...prev]);
      onSuccess();
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
      const { service } = await updateService(id, payload, token);
      setServices((prev) =>
        prev.map((svc) => (svc.id === id ? service : svc))
      );
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceDelete = async (id) => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      setLoading(true);
      setServices((prev) => prev.filter((svc) => svc.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStockCreate = async (payload, onSuccess) => {
    if (!token) return;
    try {
      setLoading(true);
      const newStock = { id: Date.now(), ...payload };
      setStocks((prev) => {
        const updated = [newStock, ...prev];
        window.localStorage.setItem('ssc_admin_stocks', JSON.stringify(updated));
        return updated;
      });
      onSuccess();
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
      setStocks((prev) => {
        const updated = prev.map((stock) => (stock.id === id ? { ...stock, ...payload } : stock));
        window.localStorage.setItem('ssc_admin_stocks', JSON.stringify(updated));
        return updated;
      });
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStockDelete = async (id) => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to delete this part?')) return;
    try {
      setLoading(true);
      setStocks((prev) => {
        const updated = prev.filter((stock) => stock.id !== id);
        window.localStorage.setItem('ssc_admin_stocks', JSON.stringify(updated));
        return updated;
      });
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

  // මෙතනදී payments වෙනස් වූ වහාම LocalStorage එකේ ස්ථිරව සේව් වන ලෙස සකසා ඇත
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

  const handleUpdate = async (id, payload) => {
    if (!token) return;
    try {
      setUpdatingId(id);
      const { appointment } = await updateAppointment(id, payload, token);
      setAppointments((prev) => prev.map((item) => (item.id === id ? appointment : item)));
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleLogout = () => {
    setAuth(null);
    setAppointments([]);
    setServices([]);
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
        {hasPermission(auth.user.role, 'services') && (
          <button
            className={`tab-button ${activeTab === 'services' ? 'active' : ''}`}
            onClick={() => setActiveTab('services')}
          >
            🛠️ Services
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
        {hasPermission(auth.user.role, 'stocks') && (
          <button
            className={`tab-button ${activeTab === 'stocks' ? 'active' : ''}`}
            onClick={() => setActiveTab('stocks')}
          >
            📦 Inventory
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
        {hasPermission(auth.user.role, 'appointments') && (
          <button
            className={`tab-button ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => setActiveTab('appointments')}
          >
            📋 Appointments
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
        {hasPermission(auth.user.role, 'technicians') && (
          <button
            className={`tab-button ${activeTab === 'technicians' ? 'active' : ''}`}
            onClick={() => setActiveTab('technicians')}
          >
            🔧 Technicians
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

        {activeTab === 'appointments' && (
          <ProtectedFeature userRole={auth.user.role} feature="appointments">
            <AppointmentTable
              appointments={appointments}
              onUpdate={handleUpdate}
              updatingId={updatingId}
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

        {activeTab === 'technicians' && (
          <ProtectedFeature userRole={auth.user.role} feature="technicians">
            <TechnicianManager
              technicians={technicians}
              serviceCenters={serviceCenters}
              loading={loading}
              onCreate={async (payload, onSuccess) => {
                if (!token) return;
                try {
                  setLoading(true);
                  const { technician } = await createTechnician(payload, token);
                  setTechnicians((prev) => [technician, ...prev]);
                  onSuccess();
                } catch (err) {
                  setError(err.message);
                } finally {
                  setLoading(false);
                }
              }}
              onUpdate={async (id, payload, onSuccess) => {
                if (!token) return;
                try {
                  setLoading(true);
                  const { technician } = await updateTechnician(id, payload, token);
                  setTechnicians((prev) => prev.map((item) => (item.id === id ? technician : item)));
                  onSuccess();
                } catch (err) {
                  setError(err.message);
                } finally {
                  setLoading(false);
                }
              }}
              onDelete={async (id) => {
                if (!token) return;
                if (!window.confirm('Delete this technician?')) return;
                try {
                  setLoading(true);
                  await deleteTechnician(id, token);
                  setTechnicians((prev) => prev.filter((item) => item.id !== id));
                } catch (err) {
                  setError(err.message);
                } finally {
                  setLoading(false);
                }
              }}
            />
          </ProtectedFeature>
        )}
      </div>
    </div>
  );
}