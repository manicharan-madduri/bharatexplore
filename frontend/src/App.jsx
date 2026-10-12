import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth, shouldRedirectToWelcomeGate, isAuthRoutePath } from './context/AuthContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { TripsProvider } from './context/TripsContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import Footer from './components/Footer';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import StateDetailPage from './pages/StateDetailPage';
import DestinationDetailPage from './pages/DestinationDetailPage';
import SearchResultsPage from './pages/SearchResultsPage';
import FavoritesPage from './pages/FavoritesPage';
import TripsPage from './pages/TripsPage';
import SmartPlannerPage from './pages/SmartPlannerPage';
import SettingsPage from './pages/SettingsPage';
import AboutPage from './pages/AboutPage';
import NotFoundPage from './pages/NotFoundPage';
import AuthPage from './pages/AuthPage';
import AccountPage from './pages/AccountPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// ScrollToTop component to reset viewport on route changes
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function MainLayout() {
  const location = useLocation();
  const { user, loading, guestMode } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  const isAuthRoute = isAuthRoutePath(location.pathname);

  if (isAuthRoute) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <ScrollToTop />
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Routes>
        </main>
      </div>
    );
  }

  // Wait for initial session check before deciding whether to enter app or show welcome gate
  if (loading && !guestMode) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: 'var(--bg-deep)',
          color: 'var(--text-secondary)',
          fontSize: '0.95rem',
        }}
      >
        Restoring your session...
      </div>
    );
  }

  // Welcome / Sign-In Gate: redirect first-time visitors without an authenticated or guest session to /auth
  if (shouldRedirectToWelcomeGate({ loading, user, guestMode, pathname: location.pathname })) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <ScrollToTop />
      
      <Sidebar 
        collapsed={sidebarCollapsed} 
        setCollapsed={setSidebarCollapsed} 
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className={`main-layout-wrapper ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} style={{ display: 'flex', flexDirection: 'column', flex: 1, width: '100%' }}>
        <Header mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/state/:slug" element={<StateDetailPage />} />
            <Route path="/destination/:id" element={<DestinationDetailPage />} />
            <Route path="/destination/slug/:slug" element={<DestinationDetailPage />} />
            <Route path="/search" element={<SearchResultsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/trips" element={<TripsPage />} />
            <Route path="/ai-planner" element={<SmartPlannerPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            
            {/* Protected Routes */}
            <Route path="/account" element={
              <ProtectedRoute>
                <AccountPage />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        
        <Footer />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <TripsProvider>
          <MainLayout />
        </TripsProvider>
      </FavoritesProvider>
    </AuthProvider>
  );
}

