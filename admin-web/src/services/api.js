function resolveApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }
  // In dev, use same-origin `/api` so Vite proxies to the backend (see vite.config.js).
  if (import.meta.env.DEV) {
    return '/api';
  }
  return 'http://10.255.111.96:5004/api';
}

const API_BASE_URL = resolveApiBaseUrl();

async function request(path, { method = 'GET', data, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const options = { method, headers };

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Request failed');
  }

  return payload;
}

export function login(credentials) {
  return request('/auth/login', { method: 'POST', data: credentials });
}

// Service API
export function fetchServices(token) {
  return request('/services', { token });
}

export function createService(data, token) {
  return request('/services', { method: 'POST', data, token });
}

export function updateService(id, data, token) {
  return request(`/services/${id}`, { method: 'PATCH', data, token });
}

export function deleteService(id, token) {
  return request(`/services/${id}`, { method: 'DELETE', token });
}

// Appointment API
export function fetchAppointments(token) {
  return request('/appointments', { token });
}

export function updateAppointment(id, payload, token) {
  return request(`/appointments/${id}/status`, {
    method: 'PATCH',
    data: payload,
    token
  });
}

export function lookupAppointment(code) {
  return request(`/appointments/lookup/${encodeURIComponent(code)}`);
}

// Service Center API
export function fetchServiceCenters(token) {
  return request('/service-centers', { token });
}

export function createServiceCenter(data, token) {
  return request('/service-centers', { method: 'POST', data, token });
}

export function updateServiceCenter(id, data, token) {
  return request(`/service-centers/${id}`, { method: 'PATCH', data, token });
}

// Loyalty API
export function fetchCustomerLoyalty(token) {
  return request('/customers/admin/loyalty', { token });
}

export function earnLoyaltyPoints(customerId, points, note, token) {
  return request('/customers/loyalty/add', {
    method: 'POST',
    data: { customerId, points, note },
    token
  });
}

export function redeemLoyaltyPoints(customerId, points, note, token) {
  return request('/customers/loyalty/use', {
    method: 'POST',
    data: { customerId, points, note },
    token
  });
}

// Stock API
export function fetchStocks(token) {
  return request('/stocks', { token });
}

export function createStock(data, token) {
  return request('/stocks', { method: 'POST', data, token });
}

export function updateStock(id, data, token) {
  return request(`/stocks/${id}`, { method: 'PATCH', data, token });
}

export function deleteStock(id, token) {
  return request(`/stocks/${id}`, { method: 'DELETE', token });
}

// Technician API
export function fetchTechnicians(token) {
  return request('/technicians', { token });
}

export function createTechnician(data, token) {
  return request('/technicians', { method: 'POST', data, token });
}

export function updateTechnician(id, data, token) {
  return request(`/technicians/${id}`, { method: 'PATCH', data, token });
}

export function deleteTechnician(id, token) {
  return request(`/technicians/${id}`, { method: 'DELETE', token });
}
