import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams, Navigate, Link } from 'react-router-dom';
import { useAuth, extractAuthError, resolvePostAuthRedirect } from '../context/AuthContext';
import { Eye, EyeOff, AlertCircle, Compass, ArrowLeft, UserCheck } from 'lucide-react';
import '../styles/auth.css';

const PasswordField = ({ value, onChange, placeholder, name, id, disabled = false, tabIndex = 0 }) => {
  const [show, setShow] = useState(false);
  
  return (
    <div className="password-wrapper">
      <input
        type={show ? 'text' : 'password'}
        name={name}
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="form-input"
        disabled={disabled}
        tabIndex={tabIndex}
        required
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setShow(!show)}
        aria-label={show ? 'Hide password' : 'Show password'}
        disabled={disabled}
        tabIndex={tabIndex}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
};

export default function AuthPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, guestMode, login, register, continueAsGuest } = useAuth();

  const initialRegisterMode =
    searchParams.get('mode') === 'register' || location.state?.mode === 'register';
  const [isRegister, setIsRegister] = useState(initialRegisterMode);

  useEffect(() => {
    const modeParam = searchParams.get('mode');
    if (modeParam === 'register') {
      setIsRegister(true);
    } else if (modeParam === 'login') {
      setIsRegister(false);
    }
  }, [searchParams]);
  
  // State for login
  const [loginForm, setLoginForm] = useState({ usernameOrEmail: '', password: '', rememberMe: false });
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // State for register
  const [registerForm, setRegisterForm] = useState({ username: '', email: '', password: '', confirmPassword: '', phoneNumber: '' });
  const [registerError, setRegisterError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const authDestination = resolvePostAuthRedirect(location.state?.from, { isGuest: false });
  const guestDestination = resolvePostAuthRedirect(location.state?.from, { isGuest: true });

  // If a valid authenticated session already exists, redirect straight into the application
  if (!loading && user) {
    return <Navigate to={authDestination} replace />;
  }

  const switchMode = (registerMode) => {
    setIsRegister(registerMode);
    setLoginError('');
    setRegisterError('');
    const nextParams = new URLSearchParams(searchParams);
    if (registerMode) {
      nextParams.set('mode', 'register');
    } else {
      nextParams.delete('mode');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const handleGuestContinue = () => {
    continueAsGuest();
    navigate(guestDestination, { replace: true });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      await login(loginForm.usernameOrEmail, loginForm.password, loginForm.rememberMe);
      navigate(authDestination, { replace: true });
    } catch (err) {
      setLoginError(extractAuthError(err, 'Login failed. Please try again.'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterError('');
    
    if (registerForm.username.trim().length < 3) {
      setRegisterError('Username must be at least 3 characters long');
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setRegisterError('Passwords do not match');
      return;
    }
    
    if (registerForm.password.length < 8) {
      setRegisterError('Password must be at least 8 characters long');
      return;
    }

    setIsRegistering(true);
    try {
      await register({
        username: registerForm.username.trim(),
        email: registerForm.email.trim(),
        password: registerForm.password,
        phoneNumber: registerForm.phoneNumber.trim()
      });
      navigate(authDestination, { replace: true });
    } catch (err) {
      setRegisterError(extractAuthError(err, 'Registration failed. Please try again.'));
    } finally {
      setIsRegistering(false);
    }
  };

  const handleLoginChange = (e) => {
    const { name, type, checked, value } = e.target;
    setLoginForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleRegisterChange = (e) => {
    setRegisterForm({ ...registerForm, [e.target.name]: e.target.value });
  };

  // Password strength logic
  const calculateStrength = (pwd) => {
    let score = 0;
    if (pwd.length > 7) score++;
    if (pwd.length > 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = calculateStrength(registerForm.password);
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const strengthColors = ['#ef4444', '#ef4444', '#f59e0b', '#f59e0b', '#10b981', '#10b981'];

  const loginTabIndex = isRegister ? -1 : 0;
  const registerTabIndex = isRegister ? 0 : -1;

  return (
    <div className="auth-container">
      <div className="auth-ambient-glow" aria-hidden="true" />
      
      {/* Top Left Guest / Return Action */}
      <button type="button" onClick={handleGuestContinue} className="auth-return-link">
        <ArrowLeft size={16} />
        <span>{guestMode ? 'Back to BharatExplore' : 'Explore as Guest'}</span>
      </button>

      <div className={`auth-card ${isRegister ? 'register' : 'login'}`}>
        
        {/* The sliding Hero Panel */}
        <div className="auth-hero-panel">
          
          <div className="auth-hero-content login" aria-hidden={isRegister}>
            <Compass size={48} style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '1rem' }} />
            <h2>Welcome to BharatExplore</h2>
            <p>Sign in to access your verified Indian tourism guide, saved itineraries, and favourite destinations—or continue as a guest anytime.</p>
            <button
              type="button"
              className="auth-switch-btn"
              onClick={() => switchMode(true)}
              tabIndex={loginTabIndex}
            >
              Create Account
            </button>
          </div>

          <div className="auth-hero-content register" aria-hidden={!isRegister}>
            <Compass size={48} style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '1rem' }} />
            <h2>Join BharatExplore</h2>
            <p>Create a free account to save favourite places across all 36 States & Union Territories and access personalised features.</p>
            <button
              type="button"
              className="auth-switch-btn"
              onClick={() => switchMode(false)}
              tabIndex={registerTabIndex}
            >
              Already have an account? Sign In
            </button>
          </div>

        </div>

        {/* Forms Container */}
        <div className="auth-forms-wrapper">
          
          {/* LOGIN FORM */}
          <div className="auth-form-panel login" aria-hidden={isRegister}>
            <h3>Login to Account</h3>
            
            {loginError && (
              <div className="auth-error" role="alert">
                <AlertCircle size={16} /> <span>{loginError}</span>
              </div>
            )}

            <form className="auth-form" onSubmit={handleLoginSubmit}>
              <div className="form-group">
                <label htmlFor="login-identity">Email or Username</label>
                <input
                  type="text"
                  id="login-identity"
                  name="usernameOrEmail"
                  value={loginForm.usernameOrEmail}
                  onChange={handleLoginChange}
                  className="form-input"
                  placeholder="hello@example.com"
                  disabled={isRegister}
                  tabIndex={loginTabIndex}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="login-password">Password</label>
                <PasswordField
                  id="login-password"
                  name="password"
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  placeholder="••••••••"
                  disabled={isRegister}
                  tabIndex={loginTabIndex}
                />
              </div>

              <div className="auth-form-footer">
                <label htmlFor="login-remember" className="auth-remember-label">
                  <input
                    type="checkbox"
                    id="login-remember"
                    name="rememberMe"
                    checked={loginForm.rememberMe}
                    onChange={handleLoginChange}
                    disabled={isRegister}
                    tabIndex={loginTabIndex}
                    style={{ accentColor: 'var(--color-brand)' }}
                  />
                  <span>Remember me (7 days)</span>
                </label>
                <Link to="/forgot-password" tabIndex={loginTabIndex}>Forgot password?</Link>
              </div>

              <button
                type="submit"
                className="btn-auth-submit"
                disabled={isLoggingIn || isRegister}
                tabIndex={loginTabIndex}
              >
                {isLoggingIn ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <div className="auth-guest-divider" aria-hidden="true">
              <span>or</span>
            </div>

            <button
              type="button"
              className="btn-guest-continue"
              onClick={handleGuestContinue}
              disabled={isRegister}
              tabIndex={loginTabIndex}
            >
              <UserCheck size={17} />
              <span>Continue as Guest</span>
            </button>

            <div className="mobile-auth-switch">
              New here? <button type="button" onClick={() => switchMode(true)} tabIndex={loginTabIndex}>Sign Up</button>
            </div>
          </div>

          {/* REGISTER FORM */}
          <div className="auth-form-panel register" aria-hidden={!isRegister}>
            <h3 style={{ marginBottom: '0.85rem' }}>Create Account</h3>
            
            {registerError && (
              <div className="auth-error" role="alert">
                <AlertCircle size={16} /> <span>{registerError}</span>
              </div>
            )}

            <form className="auth-form" style={{ gap: '0.75rem' }} onSubmit={handleRegisterSubmit}>
              
              <div className="auth-row-split">
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="reg-username">Username</label>
                  <input
                    type="text"
                    id="reg-username"
                    name="username"
                    value={registerForm.username}
                    onChange={handleRegisterChange}
                    className="form-input"
                    placeholder="traveler99"
                    disabled={!isRegister}
                    tabIndex={registerTabIndex}
                    required
                  />
                </div>
                
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="reg-phone">Phone (Optional)</label>
                  <input
                    type="tel"
                    id="reg-phone"
                    name="phoneNumber"
                    value={registerForm.phoneNumber}
                    onChange={handleRegisterChange}
                    className="form-input"
                    placeholder="+91 9876543210"
                    disabled={!isRegister}
                    tabIndex={registerTabIndex}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="reg-email">Email Address</label>
                <input
                  type="email"
                  id="reg-email"
                  name="email"
                  value={registerForm.email}
                  onChange={handleRegisterChange}
                  className="form-input"
                  placeholder="hello@example.com"
                  disabled={!isRegister}
                  tabIndex={registerTabIndex}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="reg-password">Password</label>
                <PasswordField
                  id="reg-password"
                  name="password"
                  value={registerForm.password}
                  onChange={handleRegisterChange}
                  placeholder="••••••••"
                  disabled={!isRegister}
                  tabIndex={registerTabIndex}
                />
                
                {registerForm.password.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '2px', flex: 1 }}>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div key={level} style={{
                          height: '4px', flex: 1, borderRadius: '2px',
                          background: strength >= level ? strengthColors[strength] : 'var(--glass-border-base)',
                          transition: 'background 0.3s'
                        }} />
                      ))}
                    </div>
                    <span style={{ color: strengthColors[strength], width: '65px', textAlign: 'right' }}>
                      {strengthLabels[strength]}
                    </span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="reg-confirm">Confirm Password</label>
                <PasswordField
                  id="reg-confirm"
                  name="confirmPassword"
                  value={registerForm.confirmPassword}
                  onChange={handleRegisterChange}
                  placeholder="••••••••"
                  disabled={!isRegister}
                  tabIndex={registerTabIndex}
                />
              </div>

              <button
                type="submit"
                className="btn-auth-submit"
                disabled={isRegistering || !isRegister}
                tabIndex={registerTabIndex}
                style={{ marginTop: '0.25rem' }}
              >
                {isRegistering ? 'Creating Account...' : 'Sign Up'}
              </button>
            </form>

            <div className="auth-guest-divider" aria-hidden="true">
              <span>or</span>
            </div>

            <button
              type="button"
              className="btn-guest-continue"
              onClick={handleGuestContinue}
              disabled={!isRegister}
              tabIndex={registerTabIndex}
            >
              <UserCheck size={17} />
              <span>Continue as Guest</span>
            </button>

            <div className="mobile-auth-switch">
              Already have an account? <button type="button" onClick={() => switchMode(false)} tabIndex={registerTabIndex}>Log In</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
