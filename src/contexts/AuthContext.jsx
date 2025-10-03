import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../utils/api';
import enhancedSocketService from '../services/enhancedSocketService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasValidToken, setHasValidToken] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    console.log('[AUTH] 🔍 checkAuthStatus called');
    try {
      const token = localStorage.getItem('accessToken');
      console.log('[AUTH] 🔑 Token found:', token ? 'yes' : 'no');
      if (token) {
        setHasValidToken(true);
        try {
          console.log('[AUTH] 🔍 Calling getMe API...');
          const response = await authAPI.getMe();
          console.log('[AUTH] 📡 getMe response:', response.data);
          // Handle different response structures
          const userData = response.data.data?.user || response.data.user || response.data.data;
          console.log('[AUTH] 🔍 Extracted userData:', userData);
          if (userData) {
            setUser(userData);
            setIsAuthenticated(true);
            // Connect to socket with token
            const token = localStorage.getItem('accessToken');
            if (token) {
              enhancedSocketService.connect(token);
            }
          } else {
            throw new Error('Invalid response structure');
          }
        } catch (apiError) {
          console.error('[AUTH] ❌ getMe API call failed:', apiError);
          
          // Only clear tokens if it's an authentication error (401/403)
          if (apiError.response?.status === 401 || apiError.response?.status === 403) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setHasValidToken(false);
            setIsAuthenticated(false);
          } else {
            // Network or server error - keep tokens and show as authenticated
            // This allows the user to stay logged in if backend is temporarily unavailable
            setIsAuthenticated(true);
            // Try to get user data from localStorage as fallback
            const savedUser = localStorage.getItem('userData');
            if (savedUser) {
              setUser(JSON.parse(savedUser));
            }
          }
        }
      } else {
        // No token found, user is not authenticated
        console.log('[AUTH] ❌ No token found');
        setHasValidToken(false);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setHasValidToken(false);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (phoneNumber, otp) => {
    try {
      const response = await authAPI.verifyPhoneOTP(phoneNumber, otp);
      const { accessToken, refreshToken, user: userData } = response.data.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('userData', JSON.stringify(userData)); // Save user data as fallback
      setUser(userData);
      setIsAuthenticated(true);
      setHasValidToken(true);
      
      // Connect to socket with new token
      enhancedSocketService.connect(accessToken);
      
      return { success: true, data: userData };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Login failed' };
    }
  };

  const logout = () => {
    console.log('[AUTH] 🚪 User logging out - disconnecting socket');
    
    // Send offline status to server before disconnecting
    const token = localStorage.getItem('accessToken');
    if (token && navigator.sendBeacon) {
      try {
        const baseURL = import.meta.env.VITE_API_URL || 'https://vibgyornode.onrender.com';
        // sendBeacon works better with FormData or URLSearchParams
        const formData = new FormData();
        formData.append('token', token);
        navigator.sendBeacon(`${baseURL}/user/status/offline`, formData);
        console.log('[AUTH] 📡 Offline status sent to server');
      } catch (error) {
        console.error('[AUTH] Failed to send offline status:', error);
      }
    }
    
    // Disconnect socket
    enhancedSocketService.disconnect();
    
    // Clear local storage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
    
    // Update state
    setUser(null);
    setIsAuthenticated(false);
    setHasValidToken(false);
    
    console.log('[AUTH] ✅ Logout completed');
  };

  const updateUser = (userData) => {
    setUser(prevUser => ({ ...prevUser, ...userData }));
  };

  const sendPhoneOTP = async (phoneNumber, countryCode = '+91') => {
    try {
      await authAPI.sendPhoneOTP(phoneNumber, countryCode);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to send OTP' };
    }
  };

  const resendPhoneOTP = async (phoneNumber) => {
    try {
      await authAPI.resendPhoneOTP(phoneNumber);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to resend OTP' };
    }
  };

  const sendEmailOTP = async (email) => {
    try {
      await authAPI.sendEmailOTP(email);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to send email OTP' };
    }
  };

  const verifyEmailOTP = async (otp) => {
    try {
      const response = await authAPI.verifyEmailOTP(otp);
      updateUser(response.data.data.user);
      return { success: true, data: response.data.data.user };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Email verification failed' };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      updateUser(response.data.data.user);
      return { success: true, data: response.data.data.user };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Profile update failed' };
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    hasValidToken,
    login,
    logout,
    updateUser,
    sendPhoneOTP,
    resendPhoneOTP,
    sendEmailOTP,
    verifyEmailOTP,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
