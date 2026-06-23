import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  BookOpen,
  Layers,
  Users as UsersIcon,
  UserCheck,
  LogOut,
  Menu,
  X,
  User,
  Activity,
  ServerCrash,
  FileText,
  Award,
  CalendarCheck,
  Book
} from 'lucide-react';
import Users from './Users';
import Courses from './Courses';
import Sections from './Sections';
import Enrollments from './Enrollments';
import Grades from './Grades';
import Attendance from './Attendance';
import CourseContent from './CourseContent';
import Assignments from './Assignments';

export default function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('courses');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [backendStatus, setBackendStatus] = useState('checking'); // checking | online | offline
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false); // Default closed on mobile
      } else {
        setSidebarOpen(true); // Default open on desktop
      }
    };
    
    handleResize(); // Initial call
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Check connection with backend on mount
    const checkBackend = async () => {
      try {
        await api.courses.getAll();
        setBackendStatus('online');
      } catch (err) {
        // If 401/403, we got a response, which means server is online!
        if (err.message.includes('servidor') || err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          setBackendStatus('offline');
        } else {
          setBackendStatus('online');
        }
      }
    };
    checkBackend();
  }, []);

  const handleLogoutClick = () => {
    api.auth.logout();
    onLogout();
  };

  // Determine available tabs based on role
  const getTabs = () => {
    const role = user.role;
    if (role === 'ADMIN') {
      return [
        { id: 'courses', label: 'Cursos', icon: <BookOpen size={20} /> },
        { id: 'sections', label: 'Secciones', icon: <Layers size={20} /> },
        { id: 'enrollments', label: 'Matrículas', icon: <UserCheck size={20} /> },
        { id: 'users', label: 'Usuarios', icon: <UsersIcon size={20} /> },
      ];
    } else if (role === 'TEACHER') {
      return [
        { id: 'courses', label: 'Mis Cursos', icon: <BookOpen size={20} /> },
        { id: 'sections', label: 'Mis Secciones', icon: <Layers size={20} /> },
        { id: 'enrollments', label: 'Ver Alumnos', icon: <UserCheck size={20} /> },
        { id: 'grades', label: 'Notas', icon: <Award size={20} /> },
        { id: 'attendance', label: 'Asistencia', icon: <CalendarCheck size={20} /> },
      ];
    } else {
      // STUDENT
      return [
        { id: 'courses', label: 'Mis Cursos', icon: <BookOpen size={20} /> },
        { id: 'sections', label: 'Mis Secciones', icon: <Layers size={20} /> },
        { id: 'grades', label: 'Mis Notas', icon: <Award size={20} /> },
        { id: 'attendance', label: 'Asistencia', icon: <CalendarCheck size={20} /> },
      ];
    }
  };

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'users':
        return <Users user={user} />;
      case 'courses':
        return <Courses user={user} />;
      case 'content':
        return <CourseContent user={user} />;
      case 'sections':
        return <Sections user={user} />;
      case 'enrollments':
        return <Enrollments user={user} />;
      case 'assignments':
        return <Assignments user={user} />;
      case 'grades':
        return <Grades user={user} />;
      case 'attendance':
        return <Attendance user={user} />;
      default:
        return <Courses user={user} />;
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return <span className="badge badge-admin">Administrador</span>;
      case 'TEACHER':
        return <span className="badge badge-teacher">Docente</span>;
      case 'STUDENT':
        return <span className="badge badge-student">Estudiante</span>;
      default:
        return <span className="badge">{role}</span>;
    }
  };

  const tabs = getTabs();

  return (
    <div style={styles.dashboardContainer}>
      {/* Mobile Toggle Button */}
      {isMobile && (
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)} 
          style={{
            ...styles.mobileToggleBtn,
            display: 'flex', // Force show on mobile
          }}
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      )}

      {/* Sidebar Layout */}
      <aside 
        className="glass-card" 
        style={{
          ...styles.sidebar,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-280px)',
          position: 'fixed',
          height: '100vh',
          left: 0,
          top: 0,
        }}
      >
        <div style={styles.sidebarHeader}>
          <div style={styles.sidebarLogo}>
            <div style={styles.logoDot}></div>
            <span style={styles.logoText}>Edu<span style={styles.logoTextAccent}>Track</span></span>
          </div>
        </div>

        {/* User Profile Widget */}
        <div style={styles.profileWidget}>
          <div style={styles.avatar}>
            {user.username ? user.username.substring(0, 2).toUpperCase() : 'US'}
          </div>
          <div style={styles.profileDetails}>
            <div style={styles.username}>{user.username}</div>
            <div style={styles.email}>{user.email || `${user.username}@edutrack.edu`}</div>
            <div style={styles.badgeContainer}>{getRoleBadge(user.role)}</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={styles.navMenu}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                // Auto close on mobile
                if (window.innerWidth <= 768) {
                  setSidebarOpen(false);
                }
              }}
              style={{
                ...styles.navItem,
                background: activeTab === tab.id ? 'hsla(263, 90%, 51%, 0.15)' : 'transparent',
                borderColor: activeTab === tab.id ? 'hsl(263, 90%, 51%)' : 'transparent',
                color: activeTab === tab.id ? '#fff' : 'hsl(var(--text-secondary))',
              }}
            >
              {tab.icon}
              <span style={styles.navLabel}>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Backend Connectivity Status Tracker */}
        <div style={styles.statusTracker}>
          {backendStatus === 'online' && (
            <div style={styles.statusIndicator}>
              <span style={{ ...styles.statusDot, backgroundColor: 'hsl(142, 71%, 45%)', boxShadow: '0 0 10px hsl(142, 71%, 45%)' }}></span>
              <span style={styles.statusText}>Backend Conectado</span>
            </div>
          )}
          {backendStatus === 'offline' && (
            <div style={styles.statusIndicator}>
              <span style={{ ...styles.statusDot, backgroundColor: 'hsl(0, 84%, 60%)', boxShadow: '0 0 10px hsl(0, 84%, 60%)', animation: 'pulse-glow 1.5s infinite' }}></span>
              <span style={styles.statusText}>Servidor Desconectado</span>
            </div>
          )}
          {backendStatus === 'checking' && (
            <div style={styles.statusIndicator}>
              <span style={{ ...styles.statusDot, backgroundColor: 'hsl(38, 92%, 50%)', boxShadow: '0 0 10px hsl(38, 92%, 50%)' }}></span>
              <span style={styles.statusText}>Verificando API...</span>
            </div>
          )}
        </div>

        {/* Logout Button */}
        <div style={styles.sidebarFooter}>
          <button onClick={handleLogoutClick} className="btn btn-secondary" style={styles.logoutBtn}>
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{
        ...styles.mainContent,
        marginLeft: isMobile ? '0px' : (sidebarOpen ? '280px' : '0px'),
        width: isMobile ? '100%' : (sidebarOpen ? 'calc(100vw - 280px)' : '100%'),
        paddingTop: isMobile ? '80px' : '40px',
      }}>
        <div style={{
          ...styles.contentWrapper,
          padding: isMobile ? '20px 15px' : '40px',
        }}>
          {renderActiveComponent()}
        </div>
      </main>
    </div>
  );
}

const styles = {
  dashboardContainer: {
    display: 'flex',
    minHeight: '100vh',
    width: '100vw',
    position: 'relative',
    boxSizing: 'border-box',
  },
  mobileToggleBtn: {
    position: 'fixed',
    top: '16px',
    left: '16px',
    zIndex: 999,
    background: 'var(--glass-bg)',
    border: '1px solid var(--border-light)',
    borderRadius: '8px',
    padding: '8px',
    cursor: 'pointer',
    color: '#fff',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)',
    '@media (max-width: 768px)': {
      display: 'flex',
    }
  },
  sidebar: {
    width: '280px',
    height: '100vh',
    position: 'fixed',
    top: 0,
    left: 0,
    borderRadius: 0,
    borderRight: '1px solid var(--border-light)',
    borderTop: 'none',
    borderBottom: 'none',
    borderLeft: 'none',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    zIndex: 900,
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  sidebarHeader: {
    marginBottom: '24px',
  },
  sidebarLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, hsl(263, 90%, 51%), hsl(142, 71%, 45%))',
  },
  logoText: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.5rem',
    fontWeight: '700',
  },
  logoTextAccent: {
    color: 'hsl(263, 90%, 51%)',
  },
  profileWidget: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-light)',
    borderRadius: '12px',
    padding: '12px',
    marginBottom: '24px',
  },
  avatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, hsl(263, 90%, 51%), hsl(220, 90%, 51%))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-heading)',
    fontWeight: '700',
    color: '#fff',
    fontSize: '0.95rem',
    boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
  },
  profileDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    textAlign: 'left',
    overflow: 'hidden',
  },
  username: {
    fontFamily: 'var(--font-heading)',
    fontWeight: '600',
    fontSize: '0.95rem',
    color: '#fff',
  },
  email: {
    fontSize: '0.75rem',
    color: 'hsl(var(--text-muted))',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  badgeContainer: {
    marginTop: '4px',
  },
  navMenu: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flexGrow: 1,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid transparent',
    borderLeftWidth: '3px',
    background: 'transparent',
    cursor: 'pointer',
    color: 'hsl(var(--text-secondary))',
    fontFamily: 'var(--font-heading)',
    fontWeight: '500',
    fontSize: '0.95rem',
    textAlign: 'left',
    width: '100%',
    transition: 'all 0.2s ease',
  },
  navLabel: {
    flexGrow: 1,
  },
  statusTracker: {
    padding: '12px 4px',
    borderTop: '1px solid var(--border-light)',
    borderBottom: '1px solid var(--border-light)',
    marginBottom: '16px',
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block',
  },
  statusText: {
    fontSize: '0.8rem',
    color: 'hsl(var(--text-secondary))',
  },
  sidebarFooter: {
    marginTop: 'auto',
  },
  logoutBtn: {
    width: '100%',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px',
  },
  mainContent: {
    flexGrow: 1,
    minHeight: '100vh',
    transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxSizing: 'border-box',
    width: 'calc(100vw - 280px)',
  },
  contentWrapper: {
    padding: '40px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  }
};
