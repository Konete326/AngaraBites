import React, { useState } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, AlertCircle, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';


import logoImg from '../assets/logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/auth/login', { email, password });

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <button onClick={toggleTheme} style={styles.themeToggleTop}>
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="glass-card" style={styles.card}>
        <div style={styles.header}>
          <img src={logoImg} alt="Angara Logo" style={{ width: '48px', height: 'auto', marginBottom: '1.5rem' }} />
          <p style={styles.subtitle}>Welcome back! Please login to your account.</p>
        </div>

        {error && (
          <div style={styles.errorBanner}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <div style={styles.inputWrapper}>
              <Mail style={styles.icon} size={20} />
              <input
                type="email"
                placeholder="admin@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <Lock style={styles.icon} size={20} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" style={styles.submitBtn} disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={styles.footer}>
          <p>Developed by EliteDevAgency</p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-main)',
    transition: 'background-color 0.3s ease',
  },
  themeToggleTop: {
    position: 'absolute',
    top: '2rem',
    right: '2rem',
    padding: '0.75rem',
    borderRadius: '12px',
    backgroundColor: 'var(--glass)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-main)',
    cursor: 'pointer',
  },
  card: {
    width: '100%',
    maxWidth: '450px',
    padding: '2.5rem',
    margin: '1rem',
    backgroundColor: 'var(--bg-card)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '800',
    marginBottom: '0.5rem',
    letterSpacing: '-1px',
    color: 'var(--text-main)',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'var(--text-muted)',
  },
  inputWrapper: {
    position: 'relative',
  },
  icon: {
    position: 'absolute',
    left: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-muted)',
  },
  input: {
    width: '100%',
    padding: '0.875rem 1rem 0.875rem 3rem',
    backgroundColor: 'var(--glass)',
    border: '1px solid var(--glass-border)',
    borderRadius: '8px',
    color: 'var(--text-main)',
    fontSize: '1rem',
    transition: 'all 0.3s ease',
  },
  submitBtn: {
    marginTop: '1rem',
    fontSize: '1rem',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid var(--accent-red)',
    color: 'var(--accent-red)',
    padding: '0.75rem',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1.5rem',
    fontSize: '0.875rem',
  },
  footer: {
    marginTop: '2rem',
    textAlign: 'center',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    opacity: 0.5,
  }
};

export default Login;
