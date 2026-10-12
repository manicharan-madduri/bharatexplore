import React, { useState } from 'react';
import { api, extractAuthError } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, AlertTriangle, CheckCircle } from 'lucide-react';
import '../styles/auth.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState({ text: '', isError: false });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg({ text: '', isError: false });
    setIsLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      setMsg({ text: res.data.message || 'A password reset link has been generated in the development console.', isError: false });
      setEmail('');
    } catch (err) {
      setMsg({ text: extractAuthError(err, 'An error occurred. Please try again.'), isError: true });
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
            <Mail size={32} color="var(--color-brand)" />
          </div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Forgot Password?</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
            A local reset link will be generated in the development console.
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
            <label htmlFor="email" style={{ color: 'var(--text-secondary)' }}>Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="form-input"
              style={{ background: 'var(--glass-d2)' }}
              placeholder="Enter your email"
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading} style={{ width: '100%', padding: '0.85rem' }}>
            {isLoading ? 'Sending...' : 'Reset Password'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link to="/auth" style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
            <ArrowLeft size={16} /> Back to log in
          </Link>
        </div>
      </div>
    </div>
  );
}
