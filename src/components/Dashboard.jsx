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
import Reports from './Reports';

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

  const [studentSummary, setStudentSummary] = useState({
    gpa: null,
    attendanceRate: null,
    status: 'ENROLLED',
    loading: false
  });

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    setSettingsError('');
    setSettingsSuccess('');
    
    if (newPassword.length < 6) {
      setSettingsError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setSettingsError('Las contraseñas no coinciden');
      return;
    }
    
    setSettingsLoading(true);
    try {
      await api.users.changePassword(newPassword);
      setSettingsSuccess('Contraseña actualizada exitosamente');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setSettingsError(err.message || 'Error al actualizar la contraseña');
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    if (user.role !== 'STUDENT') return;
    
    const loadStudentSummary = async () => {
      setStudentSummary(prev => ({ ...prev, loading: true }));
      try {
        const myEnrollments = await api.enrollments.getMyEnrollments();
        
        let totalGradesSum = 0;
        let gradedSectionsCount = 0;
        let totalPresent = 0;
        let totalSessions = 0;
        let isAtRisk = false;
        let activeStatus = 'ENROLLED';

        for (const enr of myEnrollments) {
          if (enr.status === 'AT_RISK') {
            isAtRisk = true;
          }
          if (enr.status === 'WITHDRAWN' && activeStatus !== 'AT_RISK') {
            activeStatus = 'WITHDRAWN';
          }
          
          // Grades
          try {
            const finalGrades = await api.grades.getFinalGrades(enr.sectionId);
            if (finalGrades && finalGrades.length > 0) {
              const myGrade = finalGrades[0];
              if (myGrade.finalAverage != null) {
                totalGradesSum += myGrade.finalAverage;
                gradedSectionsCount++;
              }
            }
          } catch (e) {
            console.error("Error loading final grade for section " + enr.sectionId, e);
          }

          // Attendance
          try {
            const sectionAttendance = await api.attendance.getBySection(enr.sectionId);
            if (sectionAttendance && sectionAttendance.length > 0) {
              totalSessions += sectionAttendance.length;
              const presentCount = sectionAttendance.filter(a => 
                a.status === 'PRESENTE' || a.status === 'TARDE' || a.status === 'JUSTIFICADO'
              ).length;
              totalPresent += presentCount;
            }
          } catch (e) {
            console.error("Error loading attendance for section " + enr.sectionId, e);
          }
        }
        
        if (isAtRisk) {
          activeStatus = 'AT_RISK';
        }

        const gpa = gradedSectionsCount > 0 ? (totalGradesSum / gradedSectionsCount) : null;
        const attendanceRate = totalSessions > 0 ? (totalPresent / totalSessions) : null;

        setStudentSummary({
          gpa: gpa != null ? Math.round(gpa * 100) / 100 : null,
          attendanceRate: attendanceRate != null ? Math.round(attendanceRate * 10000) / 100 : null,
          status: activeStatus,
          loading: false
        });
      } catch (e) {
        console.error("Error loading student summary:", e);
        setStudentSummary(prev => ({ ...prev, loading: false }));
      }
    };

    loadStudentSummary();
  }, [user.role]);

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
        { id: 'reports', label: 'Reportes', icon: <FileText size={20} /> },
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
      case 'reports':
        return <Reports user={user} />;
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
      {/* Mobile Backdrop Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 850,
          }}
        />
      )}

      {/* Mobile Toggle Button */}
      {isMobile && (
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)} 
          style={{
            ...styles.mobileToggleBtn,
            display: 'flex', // Force show on mobile
            zIndex: 950, // Sit on top of backdrop and sidebar
          }}
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      )}

      {/* Sidebar Layout */}
      <aside 
        className={isMobile ? "" : "glass-card"} 
        style={{
          ...styles.sidebar,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-280px)',
          position: 'fixed',
          height: '100vh',
          left: 0,
          top: 0,
          backgroundColor: isMobile ? 'hsl(var(--bg-secondary))' : 'var(--glass-bg)',
          backdropFilter: isMobile ? 'none' : 'blur(var(--glass-blur))',
          WebkitBackdropFilter: isMobile ? 'none' : 'blur(var(--glass-blur))',
          borderRight: '1px solid var(--border-light)',
          borderRadius: 0,
          zIndex: 900,
        }}
      >
        <div style={styles.sidebarHeader}>
          <div style={styles.sidebarLogo}>
            <div style={styles.logoDot}></div>
            <span style={styles.logoText}>Edu<span style={styles.logoTextAccent}>Track</span></span>
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
        {/* Top Header Bar */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: isMobile ? '0 15px' : '0 40px',
          marginBottom: '20px',
          boxSizing: 'border-box',
          width: '100%'
        }}>
          <h2 style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', fontWeight: '700', color: '#fff', fontFamily: 'var(--font-heading)' }}>
            {activeTab === 'courses' ? 'Catálogo de Cursos' :
             activeTab === 'sections' ? 'Secciones de Clase' :
             activeTab === 'enrollments' ? 'Matrículas Académicas' :
             activeTab === 'users' ? 'Gestión de Usuarios' :
             activeTab === 'grades' ? 'Control de Calificaciones' :
             activeTab === 'attendance' ? 'Control de Asistencias' :
             activeTab === 'reports' ? 'Reportes Académicos' : 'Panel de Control'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {user.role === 'STUDENT' && <NotificationTray />}
            
            {/* User Profile Dropdown Menu */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setProfileMenuOpen(!profileMenuOpen)} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  cursor: 'pointer',
                  color: '#fff',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, hsl(263, 90%, 51%), hsl(220, 90%, 51%))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '0.78rem',
                  color: '#fff'
                }}>
                  {user.username ? user.username.substring(0, 2).toUpperCase() : 'US'}
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{user.username}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s', transform: profileMenuOpen ? 'rotate(180deg)' : 'rotate(0)' }}><path d="m6 9 6 6 6-6"/></svg>
              </button>

              {profileMenuOpen && (
                <div className="glass-card" style={{
                  position: 'absolute',
                  top: '42px',
                  right: '0',
                  width: '240px',
                  zIndex: 999,
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-light)',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                }}>
                  <div style={{ padding: '4px 8px 8px 8px', borderBottom: '1px solid var(--border-light)', marginBottom: '4px', textAlign: 'left' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.username}</div>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>{user.email || `${user.username}@edutrack.edu`}</div>
                    <div style={{ marginTop: '6px' }}>
                      {user.role === 'ADMIN' ? (
                        <span className="badge badge-admin" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>ADMINISTRADOR</span>
                      ) : user.role === 'TEACHER' ? (
                        <span className="badge badge-teacher" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>DOCENTE</span>
                      ) : (
                        <span className="badge badge-student" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>ESTUDIANTE</span>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setShowSettingsModal(true);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'hsl(var(--text-secondary))',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <span>Mi Perfil y Seguridad</span>
                  </button>

                  <button 
                    onClick={handleLogoutClick}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'hsl(0, 84%, 65%)',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.05)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Student Summary Cards (RF12) */}
        {user.role === 'STUDENT' && activeTab === 'courses' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: '20px',
            padding: isMobile ? '0 15px 20px 15px' : '0 40px 20px 40px',
            boxSizing: 'border-box',
            width: '100%'
          }}>
            <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
              <div style={{ background: 'hsla(263, 90%, 51%, 0.15)', color: 'hsl(263, 90%, 65%)', padding: '12px', borderRadius: '50%' }}>
                <Award size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Promedio General</span>
                <span style={{ fontSize: '1.6rem', fontWeight: '700', color: '#fff' }}>
                  {studentSummary.loading ? '...' : (studentSummary.gpa != null ? studentSummary.gpa.toFixed(2) : 'Sin notas')}
                </span>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
              <div style={{ background: 'hsla(142, 71%, 45%, 0.15)', color: 'hsl(142, 71%, 55%)', padding: '12px', borderRadius: '50%' }}>
                <CalendarCheck size={24} />
              </div>
              <div style={{ flexGrow: 1 }}>
                <span style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Asistencia Promedio</span>
                <span style={{ fontSize: '1.6rem', fontWeight: '700', color: '#fff' }}>
                  {studentSummary.loading ? '...' : (studentSummary.attendanceRate != null ? `${studentSummary.attendanceRate.toFixed(1)}%` : 'Sin registro')}
                </span>
                {studentSummary.attendanceRate != null && (
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${studentSummary.attendanceRate}%`, 
                      height: '100%', 
                      background: studentSummary.attendanceRate < 70.0 ? 'hsl(0, 84%, 60%)' : 'hsl(142, 71%, 45%)',
                      borderRadius: '3px',
                      transition: 'width 0.5s ease'
                    }}></div>
                  </div>
                )}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
              <div style={{ 
                background: studentSummary.status === 'AT_RISK' ? 'hsla(0, 84%, 60%, 0.15)' : (studentSummary.status === 'WITHDRAWN' ? 'rgba(255,255,255,0.05)' : 'hsla(142, 71%, 45%, 0.15)'), 
                color: studentSummary.status === 'AT_RISK' ? 'hsl(0, 84%, 65%)' : (studentSummary.status === 'WITHDRAWN' ? 'hsl(var(--text-muted))' : 'hsl(142, 71%, 55%)'), 
                padding: '12px', 
                borderRadius: '50%' 
              }}>
                <Activity size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado Académico</span>
                <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff', display: 'block', marginTop: '4px' }}>
                  {studentSummary.loading ? '...' : (
                    studentSummary.status === 'AT_RISK' ? (
                      <span className="badge badge-admin" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>OBSERVADO</span>
                    ) : studentSummary.status === 'WITHDRAWN' ? (
                      <span className="badge" style={{ padding: '4px 10px', fontSize: '0.8rem', backgroundColor: 'rgba(255,255,255,0.1)', color: '#aaa' }}>RETIRADO</span>
                    ) : (
                      <span className="badge badge-teacher" style={{ padding: '4px 10px', fontSize: '0.8rem', backgroundColor: 'hsla(142, 71%, 45%, 0.2)', color: 'hsl(142, 71%, 55%)' }}>ACTIVO</span>
                    )
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        <div style={{
          ...styles.contentWrapper,
          padding: isMobile ? '20px 15px' : '40px',
          paddingTop: '0px'
        }}>
          {renderActiveComponent()}
        </div>
      </main>

      {/* Settings Modal (Change Password) */}
      {showSettingsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <div className="glass-card" style={{
            width: '100%',
            maxWidth: '450px',
            padding: '28px',
            borderRadius: '16px',
            border: '1px solid var(--border-light)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            position: 'relative'
          }}>
            <button 
              onClick={() => {
                setShowSettingsModal(false);
                setSettingsError('');
                setSettingsSuccess('');
              }}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'transparent',
                border: 'none',
                color: 'hsl(var(--text-muted))',
                fontSize: '1.25rem',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
            
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.3rem', fontWeight: '700', color: '#fff' }}>Mi Perfil y Seguridad</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>Consulta tu información institucional y actualiza tus credenciales de acceso.</p>
            
            {settingsError && (
              <div className="alert alert-danger" style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem' }}>
                {settingsError}
              </div>
            )}
            
            {settingsSuccess && (
              <div className="alert alert-success" style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem' }}>
                {settingsSuccess}
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', display: 'block', textTransform: 'uppercase' }}>Nombre de usuario</span>
                  <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: '600' }}>{user.username}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', display: 'block', textTransform: 'uppercase' }}>Rol asignado</span>
                  <span style={{ fontSize: '0.85rem', color: 'hsl(263, 90%, 75%)', fontWeight: '600' }}>{user.role}</span>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', display: 'block', textTransform: 'uppercase' }}>Correo Electrónico</span>
                  <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: '600' }}>{user.email || `${user.username}@edutrack.edu`}</span>
                </div>
              </div>
              
              <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '4px 0' }} />
              
              <form onSubmit={handlePasswordChangeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '6px', display: 'block' }}>Nueva Contraseña</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    style={{ fontSize: '0.85rem', padding: '10px' }}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '6px', display: 'block' }}>Confirmar Nueva Contraseña</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="Repite la contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={{ fontSize: '0.85rem', padding: '10px' }}
                  />
                </div>
                
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={settingsLoading}
                  style={{ width: '100%', padding: '10px', fontSize: '0.88rem', marginTop: '8px', justifyContent: 'center' }}
                >
                  {settingsLoading ? 'Guardando...' : 'Actualizar Contraseña'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
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

function NotificationTray() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const data = await api.notifications.getAll();
      setNotifications(data);
      const countData = await api.notifications.getUnreadCount();
      setUnreadCount(countData.unreadCount);
    } catch (e) {
      console.error("Error fetching notifications:", e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllAsRead = async () => {
    try {
      await api.notifications.markAllAsRead();
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.notifications.markAsRead(id);
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        style={{
          background: 'transparent',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          position: 'relative',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bell"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            background: 'hsl(0, 84%, 60%)',
            color: '#fff',
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            fontSize: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            boxShadow: '0 0 5px rgba(0,0,0,0.5)'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="glass-card" style={{
          position: 'absolute',
          top: '40px',
          right: '0',
          width: '320px',
          maxHeight: '400px',
          overflowY: 'auto',
          zIndex: 1000,
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          border: '1px solid var(--border-light)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          borderRadius: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Alertas Académicas</span>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead} 
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'hsl(263, 90%, 65%)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Marcar todas
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {notifications.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', textAlign: 'center', padding: '12px 0' }}>
                No tienes notificaciones
              </div>
            ) : (
              notifications.map(n => (
                <div 
                  key={n.id} 
                  onClick={() => !n.read && handleMarkAsRead(n.id)}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    backgroundColor: n.read ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.04)',
                    borderLeft: n.read ? '3px solid transparent' : '3px solid hsl(263, 90%, 51%)',
                    cursor: n.read ? 'default' : 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <p style={{ margin: 0, fontSize: '0.82rem', color: n.read ? 'hsl(var(--text-secondary))' : '#fff', lineHeight: '1.3' }}>
                    {n.message}
                  </p>
                  <span style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))' }}>
                    {new Date(n.createdAt).toLocaleString('es-PE', { hour12: true, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
