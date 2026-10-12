import React, { useState } from 'react';
import { api, extractAuthError } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, AlertTriangle, CheckCircle } from 'lucide-react';
import '../styles/auth.css';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState({ text: '', isError: false });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg({ text: '', isError: false });
    
    if (!token || !email) {
      setMsg({ text: 'Invalid reset link. Missing token or email.', isError: true });
      return;
    }

    if (password !== confirmPassword) {
      setMsg({ text: 'Passwords do not match.', isError: true });
      return;
    }

    if (password.length < 8) {
      setMsg({ text: 'Password must be at least 8 characters long.', isError: true });
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/auth/reset-password', { token, email, newPassword: password });
      setMsg({ text: res.data.message, isError: false });
      
      setTimeout(() => {
        navigate('/auth');
      }, 3000);
      
    } catch (err) {
      setMsg({ text: extractAuthError(err, 'Failed to reset password.'), isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-ambient-glow" />
      
      <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '3rem', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(14,165,233,0.1)', borderRadius: '50%', marginBottom: '1rem' }}>
            <KeyRound size={32} color="var(--color-brand)" />
          </div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Set New Password</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
            Your new password must be different from previous used passwords.
          </p>
        </div>

        {msg.text && (
          <div style={{
            padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem',
            background: msg.isError ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
            color: msg.isError ? '#ef4444' : '#10b981',
            display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem'
          }}>
            {msg.isError ? <AlertTriangle size={18}/> : <CheckCircle size={18}/>}
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-group">
            <label htmlFor="new-password" style={{ color: 'var(--text-secondary)' }}>New Password</label>
            <input
              type="password"
              id="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="form-input"
              style={{ background: 'var(--glass-d2)' }}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password" style={{ color: 'var(--text-secondary)' }}>Confirm Password</label>
            <input
              type="password"
              id="confirm-password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="form-input"
              style={{ background: 'var(--glass-d2)' }}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading} style={{ width: '100%', padding: '0.85rem' }}>
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

      </div>
    </div>
  );
}
