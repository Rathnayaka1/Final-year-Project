import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

function resolveApiBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  // In Expo Go, use the same host as Metro to avoid stale hardcoded IPs.
  const hostUri = Constants.expoConfig?.hostUri;
  const metroHost = hostUri ? hostUri.split(':')[0] : null;
  if (metroHost) {
    return `http://${metroHost}:5000/api`;
  }

  // Final local fallbacks for simulators/emulators.
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }

  return 'http://localhost:5000/api';
}

const API_BASE_URL = resolveApiBaseUrl();

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000
});

// Auth & Customer APIs
export async function registerCustomer(data) {
  const { data: response } = await client.post('/customers/register', data);
  return response;
}

export async function loginCustomer(data) {
  const { data: response } = await client.post('/customers/login', data);
  return response;
}

export async function getCustomerProfile(token) {
  const { data } = await client.get('/customers/profile', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data.customer;
}

export async function updateCustomerProfile(data, token) {
  const { data: response } = await client.patch('/customers/profile', data, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.customer;
}

// Service Centers APIs
export async function getNearbyServiceCenters(lat, lng, maxDistance = 50000) {
  const { data } = await client.get('/service-centers/nearby', {
    params: { lat, lng, maxDistance }
  });
  return data.serviceCenters;
}

export async function getServiceCenters() {
  const { data } = await client.get('/service-centers');
  return data.serviceCenters;
}

// Services APIs
export async function getServices() {
  const { data } = await client.get('/services');
  return data.services;
}

// Appointments APIs
export async function bookService(payload, token) {
  const { data } = await client.post('/appointments', payload, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return data.appointment;
}

export async function getMyAppointments(token) {
  const { data } = await client.get('/appointments/my-appointments', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data.appointments;
}

export async function getActiveAppointment(token) {
  const { data } = await client.get('/appointments/active', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data.appointment;
}

export async function checkAppointmentStatus(code) {
  const { data } = await client.get(`/appointments/lookup/${encodeURIComponent(code)}`);
  return data.appointment;
}

// Password Reset APIs
export async function requestPasswordReset(phone) {
  const { data } = await client.post('/customers/forgot-password', { phone });
  return data;
}

export async function verifyResetOTP(phone, code) {
  const { data } = await client.post('/customers/verify-reset-otp', { phone, code });
  return data;
}

export async function resetPassword(resetToken, newPassword) {
  const { data } = await client.post('/customers/reset-password', { resetToken, newPassword });
  return data;
}

export async function getLoyaltySummary(token) {
  const { data } = await client.get('/customers/loyalty', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
}

export async function redeemLoyaltyPoints(points, token, note = '') {
  const { data } = await client.post(
    '/customers/loyalty/use',
    { points, note },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

export { API_BASE_URL };
