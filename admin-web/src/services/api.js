function resolveApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }
  // In dev, use same-origin `/api` so Vite proxies to the backend (see vite.config.js).
  if (import.meta.env.DEV) {
    return '/api';
  }
  return
return 'http://10.255.111.96:5000/api';
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



export function fetchServiceCenters(token) {
  return request('/service-centers', { token });
}

export function createServiceCenter(data, token) {
  return request('/service-centers', { method: 'POST', data, token });
}

export function updateServiceCenter(id, data, token) {
  return request(`/service-centers/${id}`, { method: 'PATCH', data, token });
}

export function fetchCustomerLoyalty(token) {
  return request('/customers/admin/loyalty', { token });
}


