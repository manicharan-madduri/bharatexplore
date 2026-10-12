import React, { useState, useEffect } from 'react';
import { useAuth, api, extractAuthError, resolvePostLogoutRedirect } from '../context/AuthContext';
import { clearUserFavoritesStorage } from '../utils/favoritesStorage';
import { clearUserTripsStorage } from '../utils/tripsStorage';
import { User as UserIcon, Shield, AlertTriangle, LogOut, CheckCircle, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/auth.css';

export default function AccountPage() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile state
  const [profileForm, setProfileForm] = useState({ 
    username: user?.username || '', 
    email: user?.email || '', 
    phoneNumber: user?.phoneNumber || '' 
  });
  const [profileMsg, setProfileMsg] = useState({ text: '', isError: false });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password state
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordMsg, setPasswordMsg] = useState({ text: '', isError: false });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Danger zone state
  const [dangerAction, setDangerAction] = useState(null); // 'deactivate' or 'delete'
  const [dangerPassword, setDangerPassword] = useState('');
  const [dangerMsg, setDangerMsg] = useState({ text: '', isError: false });

  useEffect(() => {
    if (user) {
      setProfileForm({
        username: user.username || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || ''
      });
    }
  }, [user]);

  const handleLogout = async () => {
    const target = resolvePostLogoutRedirect({ pathname: '/account' });
    await logout();
    navigate(target.pathname, { replace: true, state: target.state });
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileMsg({ text: '', isError: false });
    setIsUpdatingProfile(true);
    try {
      const res = await api.put('/account/update', {
        username: profileForm.username.trim(),
        email: profileForm.email.trim(),
        phoneNumber: (profileForm.phoneNumber || '').trim()
      });
      setUser(res.data.data);
      setProfileMsg({ text: 'Profile updated successfully.', isError: false });
    } catch (err) {
      setProfileMsg({ text: extractAuthError(err, 'Failed to update profile.'), isError: true });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setPasswordMsg({ text: '', isError: false });
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMsg({ text: 'New passwords do not match.', isError: true });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await api.put('/account/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordMsg({ text: res.data.message, isError: false });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
      // Auto logout after password change
      setTimeout(async () => {
        await logout();
        navigate('/auth', { replace: true });
      }, 3000);
      
    } catch (err) {
      setPasswordMsg({ text: extractAuthError(err, 'Failed to update password.'), isError: true });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDangerAction = async (e) => {
    e.preventDefault();
    setDangerMsg({ text: '', isError: false });
    
    if (!dangerPassword) {
      setDangerMsg({ text: 'Password is required to confirm action.', isError: true });
      return;
    }

    const accountUserSnapshot = user ? { ...user } : null;

    try {
      if (dangerAction === 'deactivate') {
        await api.post('/account/deactivate', { currentPassword: dangerPassword, newPassword: 'dummy' });
      } else if (dangerAction === 'delete') {
        await api.delete('/account/delete', { data: { currentPassword: dangerPassword, newPassword: 'dummy' } });
        clearUserFavoritesStorage(accountUserSnapshot);
        clearUserTripsStorage(accountUserSnapshot);
      }
      
      await logout();
      navigate('/auth', { replace: true });
      
    } catch (err) {
      setDangerMsg({ text: extractAuthError(err, 'Action failed. Incorrect password?'), isError: true });
    }
  };

  return (
    <div className="container account-page-container">
      
      <div className="account-header">
        <div>
          <h1 className="section-title">Account Settings</h1>
          <p className="section-subtitle">Manage your profile, security, and preferences</p>
        </div>
        
        <button
          type="button"
          onClick={handleLogout}
          className="btn btn-secondary account-logout-btn"
          aria-label="Sign out of your account"
        >
          <LogOut size={18} /> Sign Out
        </button>
      </div>

      <div className="account-layout">
        
        {/* Sidebar Nav */}
        <div className="glass-panel account-sidebar">
          <nav className="account-nav" aria-label="Account sections">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`account-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            >
              <UserIcon size={18} /> Profile
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`account-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            >
              <Shield size={18} /> Security
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('danger')}
              className={`account-tab-btn danger ${activeTab === 'danger' ? 'active' : ''}`}
            >
              <AlertTriangle size={18} /> Danger Zone
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="glass-panel account-content-panel">
          
          {activeTab === 'profile' && (
            <div>
              <h2 className="account-section-heading">Public Profile</h2>
              
              {profileMsg.text && (
                <div
                  role="alert"
                  style={{
                    padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem',
                    background: profileMsg.isError ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                    color: profileMsg.isError ? '#ef4444' : '#10b981',
                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}
                >
                  {profileMsg.isError ? <AlertTriangle size={18}/> : <CheckCircle size={18}/>}
                  {profileMsg.text}
                </div>
              )}

              <form onSubmit={handleProfileUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label htmlFor="account-username" className="account-label">Username</label>
                  <input
                    id="account-username"
                    type="text"
                    className="form-input account-form-input"
                    value={profileForm.username}
                    onChange={e => setProfileForm({...profileForm, username: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="account-email" className="account-label">Email</label>
                  <input
                    id="account-email"
                    type="email"
                    className="form-input account-form-input"
                    value={profileForm.email}
                    onChange={e => setProfileForm({...profileForm, email: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="account-phone" className="account-label">Phone Number</label>
                  <input
                    id="account-phone"
                    type="tel"
                    className="form-input account-form-input"
                    placeholder="+91 9876543210"
                    value={profileForm.phoneNumber}
                    onChange={e => setProfileForm({...profileForm, phoneNumber: e.target.value})}
                  />
                </div>
                
                <button type="submit" className="btn-primary" disabled={isUpdatingProfile} style={{ width: 'fit-content', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Save size={18} /> {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <h2 className="account-section-heading">Change Password</h2>
              
              {passwordMsg.text && (
                <div
                  role="alert"
                  style={{
                    padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem',
                    background: passwordMsg.isError ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                    color: passwordMsg.isError ? '#ef4444' : '#10b981',
                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}
                >
                  {passwordMsg.isError ? <AlertTriangle size={18}/> : <CheckCircle size={18}/>}
                  {passwordMsg.text}
                </div>
              )}

              <form onSubmit={handlePasswordUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label htmlFor="account-current-password" className="account-label">Current Password</label>
                  <input
                    id="account-current-password"
                    type="password"
                    className="form-input account-form-input"
                    value={passwordForm.currentPassword}
                    onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="account-new-password" className="account-label">New Password</label>
                  <input
                    id="account-new-password"
                    type="password"
                    className="form-input account-form-input"
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    required
                    minLength="8"
                  />
                </div>
                <div>
                  <label htmlFor="account-confirm-password" className="account-label">Confirm New Password</label>
                  <input
                    id="account-confirm-password"
                    type="password"
                    className="form-input account-form-input"
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    required
                    minLength="8"
                  />
                </div>
                
                <button type="submit" className="btn-primary" disabled={isUpdatingPassword} style={{ width: 'fit-content' }}>
                  {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'danger' && (
            <div>
              <h2 className="account-section-heading" style={{ color: '#ef4444' }}>Danger Zone</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                
                {/* Deactivate */}
                <div style={{ border: '1px solid rgba(239,68,68,0.2)', padding: '1.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.05)' }}>
                  <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Deactivate Account</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.95rem', lineHeight: '1.5' }}>
                    Deactivating your account will hide your profile and log you out. 
                    You can reactivate it later by contacting support.
                  </p>
                  <button type="button" onClick={() => setDangerAction('deactivate')} className="btn-secondary" style={{ color: '#ef4444', borderColor: '#ef4444' }}>
                    Deactivate Account
                  </button>
                </div>

                {/* Delete */}
                <div style={{ border: '1px solid rgba(239,68,68,0.2)', padding: '1.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.05)' }}>
                  <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Delete Account</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.95rem', lineHeight: '1.5' }}>
                    Permanently remove your account and all associated data. This action cannot be undone.
                  </p>
                  <button type="button" onClick={() => setDangerAction('delete')} className="btn-secondary" style={{ background: '#ef4444', color: '#fff', border: 'none' }}>
                    Delete Account
                  </button>
                </div>

                {/* Confirmation Form */}
                {dangerAction && (
                  <div style={{ marginTop: '1rem', padding: '1.5rem', background: 'var(--glass-d2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border-base)' }}>
                    <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Confirm {dangerAction === 'deactivate' ? 'Deactivation' : 'Deletion'}</h4>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>Please enter your password to confirm this action.</p>
                    
                    {dangerMsg.text && (
                      <div role="alert" style={{ color: '#ef4444', fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertTriangle size={16} /> {dangerMsg.text}
                      </div>
                    )}

                    <form onSubmit={handleDangerAction} className="account-confirm-row">
                      <input 
                        type="password" 
                        placeholder="Current Password" 
                        aria-label="Current Password"
                        className="form-input"
                        style={{ flex: 1 }}
                        value={dangerPassword}
                        onChange={e => setDangerPassword(e.target.value)}
                        required
                      />
                      <button type="button" onClick={() => {setDangerAction(null); setDangerPassword(''); setDangerMsg({text:'', isError:false})}} className="btn-secondary">Cancel</button>
                      <button type="submit" className="btn-primary" style={{ background: '#ef4444', border: 'none' }}>Confirm</button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

