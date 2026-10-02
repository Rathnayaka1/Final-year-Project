import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loginCustomer,
  registerCustomer,
  getCustomerProfile
} from '../services/api';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const storedToken = await AsyncStorage.getItem('auth_token');
      const storedUser = await AsyncStorage.getItem('auth_user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Failed to load auth:', error);
    } finally {
      setLoading(false);
    }
  }

  async function login(identifier, password) {
    const response = await loginCustomer({ identifier, password });
    await AsyncStorage.setItem('auth_token', response.token);
    await AsyncStorage.setItem('auth_user', JSON.stringify(response.customer));
    setToken(response.token);
    setUser(response.customer);
    return response;
  }

  async function register(data) {
    const response = await registerCustomer(data);
    await AsyncStorage.setItem('auth_token', response.token);
    await AsyncStorage.setItem('auth_user', JSON.stringify(response.customer));
    setToken(response.token);
    setUser(response.customer);
    return response;
  }

  async function logout() {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
  }

  async function refreshProfile() {
    if (token) {
      const profile = await getCustomerProfile(token);
      await AsyncStorage.setItem('auth_user', JSON.stringify(profile));
      setUser(profile);
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
