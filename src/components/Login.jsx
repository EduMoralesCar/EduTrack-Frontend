import React, { useState } from 'react';
import { api } from '../services/api';
import { User, Lock, LogIn, ShieldAlert, GraduationCap, School } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Por favor, complete todos los campos');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = await api.auth.login(username, password);
      onLoginSuccess(data.user || { username, role: data.role });
    } catch (err) {
      setError(err.message || 'Error de inicio de sesión. Verifique sus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (user, pass) => {
    setUsername(user);
    setPassword(pass);
    setError('');
  };

  return (
    <div style={styles.container}>
      <div className="glass-card" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <GraduationCap size={44} color="hsl(263, 90%, 60%)" />
          </div>
          <h1 style={styles.title}>Edu<span style={styles.accentText}>Track</span></h1>
          <p style={styles.subtitle}>Gestión Académica Centralizada</p>
        </div>

        {error && (
          <div className="alert alert-danger" style={styles.alert}>
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="form-group">
            <label className="form-label">Nombre de Usuario</label>
            <div style={styles.inputWrapper}>
              <User size={18} style={styles.inputIcon} />
              <input
                type="text"
                className="form-input"
                placeholder="Ingrese su usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={styles.input}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={styles.submitBtn}
            disabled={loading}
          >
            {loading ? (
              <span style={styles.spinner}></span>
            ) : (
              <>
                <span>Ingresar al Sistema</span>
                <LogIn size={18} />
              </>
            )}
          </button>
        </form>

        <div style={styles.demoSection}>
          <h4 style={styles.demoTitle}>Acceso de Demostración</h4>
          <div style={styles.demoGrid}>
            <button
              onClick={() => handleQuickLogin('JUAN PABLO', 'Admin123!')}
              style={{ ...styles.demoBtn, borderLeft: '3px solid hsl(263, 90%, 51%)' }}
              disabled={loading}
            >
              <div style={styles.demoRole}>Administrador</div>
              <div style={styles.demoUser}>JUAN PABLO / Admin123!</div>
            </button>

            <button
              onClick={() => handleQuickLogin('FERMIN LOPEZ', 'Docente123!')}
              style={{ ...styles.demoBtn, borderLeft: '3px solid hsl(220, 90%, 51%)' }}
              disabled={loading}
            >
              <div style={styles.demoRole}>Docente</div>
              <div style={styles.demoUser}>FERMIN LOPEZ / Docente123!</div>
            </button>

            <button
              onClick={() => handleQuickLogin('EDU MORALES', 'Estudiante123!')}
              style={{ ...styles.demoBtn, borderLeft: '3px solid hsl(142, 71%, 45%)' }}
              disabled={loading}
            >
              <div style={styles.demoRole}>Estudiante</div>
              <div style={styles.demoUser}>EDU MORALES / Estudiante123!</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100vw',
    padding: '20px',
    boxSizing: 'border-box',
  },
  card: {
    width: '100%',
    maxWidth: '460px',
    animation: 'slideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) ease',
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  logoContainer: {
    background: 'rgba(255, 255, 255, 0.03)',
    width: '80px',
    height: '80px',
    borderRadius: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  title: {
    fontSize: '2.5rem',
    margin: '0 0 4px',
    fontWeight: '700',
  },
  accentText: {
    background: 'linear-gradient(135deg, hsl(263, 90%, 51%), hsl(142, 71%, 45%))',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: 'hsl(var(--text-secondary))',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '16px',
    color: 'hsl(var(--text-muted))',
  },
  input: {
    paddingLeft: '48px',
  },
  submitBtn: {
    marginTop: '12px',
    padding: '12px',
    fontSize: '1rem',
  },
  alert: {
    marginBottom: '16px',
  },
  spinner: {
    display: 'inline-block',
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  demoSection: {
    marginTop: '28px',
    borderTop: '1px solid var(--border-light)',
    paddingTop: '20px',
  },
  demoTitle: {
    fontSize: '0.85rem',
    fontFamily: 'var(--font-heading)',
    color: 'hsl(var(--text-muted))',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '12px',
    textAlign: 'center',
  },
  demoGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  demoBtn: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-light)',
    borderRadius: '8px',
    padding: '10px 14px',
    textAlign: 'left',
    cursor: 'pointer',
    color: '#fff',
    transition: 'all 0.2s ease',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  demoRole: {
    fontSize: '0.9rem',
    fontWeight: '600',
    fontFamily: 'var(--font-heading)',
  },
  demoUser: {
    fontSize: '0.8rem',
    color: 'hsl(var(--text-secondary))',
    fontFamily: 'monospace',
  }
};
