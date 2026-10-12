import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import {
  GUEST_SESSION_KEY,
  readGuestSession,
  writeGuestSession,
  resolvePostAuthRedirect,
  resolvePostLogoutRedirect,
  shouldRedirectToWelcomeGate,
  isAuthRoutePath,
} from '../utils/authSession';

const AuthContext = createContext();

export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL)
    ? import.meta.env.VITE_API_BASE_URL
    : '/api';

// Create an Axios instance with credentials
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export {
  GUEST_SESSION_KEY,
  readGuestSession,
  writeGuestSession,
  resolvePostAuthRedirect,
  resolvePostLogoutRedirect,
  shouldRedirectToWelcomeGate,
  isAuthRoutePath,
};

export function extractAuthError(err, fallback = 'Request failed. Please try again.') {
  const data = err?.response?.data;
  if (!data) {
    return err?.message || fallback;
  }
  if (data.validationErrors && typeof data.validationErrors === 'object') {
    const firstValidationMsg = Object.values(data.validationErrors).find(Boolean);
    if (firstValidationMsg) return firstValidationMsg;
  }
  if (typeof data.message === 'string' && data.message.trim()) {
    return data.message;
  }
  return fallback;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guestMode, setGuestMode] = useState(() => readGuestSession());

  const checkAuth = async () => {
    try {
      const res = await api.get('/account/me');
      if (res.data?.success && res.data?.data) {
        setUser(res.data.data);
        setGuestMode(false);
        writeGuestSession(false);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
      // Preserve existing guestMode if the visitor already selected "Continue as Guest" in this browser session
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const interceptorId = api.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error?.response?.status;
        const requestUrl = error?.config?.url || '';
        if (status === 401 && requestUrl.includes('/account/')) {
          setUser(null);
        }
        return Promise.reject(error);
      }
    );
    return () => {
      api.interceptors.response.eject(interceptorId);
    };
  }, []);

  const login = async (usernameOrEmail, password, rememberMe = false) => {
    const res = await api.post('/auth/login', {
      usernameOrEmail: usernameOrEmail.trim(),
      password,
      rememberMe: Boolean(rememberMe),
    });
    if (res.data.success) {
      setUser(res.data.data.user);
      setGuestMode(false);
      writeGuestSession(false);
    }
    return res.data;
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    if (res.data.success) {
      setUser(res.data.data.user);
      setGuestMode(false);
      writeGuestSession(false);
    }
    return res.data;
  };

  const logout = async () => {
    // Update AuthContext state immediately so the UI no longer treats the user as authenticated
    setUser(null);
    setGuestMode(false);
    writeGuestSession(false);
    try {
      await api.post('/auth/logout');
    } catch {
      // Local session is already cleared even if server logout fails
    } finally {
      setUser(null);
      setGuestMode(false);
      writeGuestSession(false);
    }
  };

  const continueAsGuest = () => {
    setGuestMode(true);
    writeGuestSession(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        guestMode,
        continueAsGuest,
        login,
        register,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

