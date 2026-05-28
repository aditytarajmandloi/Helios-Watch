import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API_URL = 'http://localhost:5000/api/auth';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await axios.get(`${API_URL}/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data.success) {
            setUser(res.data.user);
          } else {
            localStorage.removeItem('token');
          }
        } catch (error) {
          console.error("Auth check failed");
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  const login = async (email, password) => {
    const res = await axios.post(`${API_URL}/login`, { email, password });
    if (res.data.success) {
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      return { success: true };
    }
    return { success: false, message: res.data.message };
  };

  const register = async (email, password) => {
    const res = await axios.post(`${API_URL}/register`, { email, password });
    if (res.data.success) {
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      return { success: true };
    }
    return { success: false, message: res.data.message };
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const forgotPassword = async (email) => {
    try {
      const res = await axios.post(`${API_URL}/forgot-password`, { email });
      return { success: res.data.success, message: res.data.message };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error sending OTP' };
    }
  };

  const resetPassword = async (email, otp, newPassword) => {
    try {
      const res = await axios.post(`${API_URL}/reset-password`, { email, otp, newPassword });
      return { success: res.data.success, message: res.data.message };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error resetting password' };
    }
  };

  const toggleAlerts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/toggle-alerts`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setUser({ ...user, receiveAlerts: res.data.receiveAlerts });
        return res.data.receiveAlerts;
      }
    } catch (e) {
      console.error("Failed to toggle alerts");
    }
    return user.receiveAlerts;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, toggleAlerts, forgotPassword, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
