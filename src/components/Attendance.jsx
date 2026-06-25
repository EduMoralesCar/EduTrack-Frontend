import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { CalendarCheck, BookOpen, Calendar, User, CheckCircle, TrendingUp, FileText, Check, X, Upload, Download } from 'lucide-react';

export default function Attendance({ user }) {
  const [sections, setSections] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [availableSections, setAvailableSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState('');
  
  const [enrollments, setEnrollments] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  
  // Justification states
  const [justifications, setJustifications] = useState([]);
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'justifications'
  const [submittingJustification, setSubmittingJustification] = useState(null);
  
  // Custom states for weekly calendar
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedStudentFilter, setSelectedStudentFilter] = useState(''); // Student filter for teachers
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification({ message: '', type: '' });
    }, 4000);
  };

  useEffect(() => {
    loadSections();
  }, []);

  const loadSections = async () => {
    try {
      const data = await api.sections.getAll();
      let filteredData = data;
      if (user.role === 'TEACHER') {
        filteredData = data.filter(s => s.teacherId === user.id || s.teacherUsername?.toLowerCase() === user.username.toLowerCase());
      } else if (user.role === 'STUDENT') {
        const myEnrs = await api.enrollments.getMyEnrollments();
        const enrolledIds = myEnrs.map(e => e.sectionId);
        filteredData = data.filter(s => enrolledIds.includes(s.id));
      }
      setSections(filteredData);
      
      const uniquePeriods = [...new Set(filteredData.map(s => s.period))].sort().reverse();
      setPeriods(uniquePeriods);
      
      const defaultPeriod = uniquePeriods.includes('2026-I') ? '2026-I' : (uniquePeriods[0] || '');
      if (defaultPeriod) {
        setSelectedPeriod(defaultPeriod);
        filterSectionsByPeriod(filteredData, defaultPeriod);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadSectionData = async (sectionId) => {
    try {
      if (user.role === 'STUDENT') {
        const studentIdVal = user.id || user.userId;
        const myEnrs = [{ studentId: studentIdVal, studentUsername: user.username, sectionId: Number(sectionId) }];
        setEnrollments(myEnrs);
        setSelectedStudentFilter(String(studentIdVal));
      } else {
        try {
          const enrs = await api.enrollments.getBySectionId(sectionId);
          setEnrollments(enrs);
        } catch (enrErr) {
          console.error("Enrollments load error", enrErr);
          setEnrollments([]);
        }
      }
      
      const atts = await api.attendance.getBySection(sectionId);
      setAttendanceRecords(atts || []);
      if (user.role !== 'STUDENT') {
        await loadJustifications(sectionId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadJustifications = async (sectionId) => {
    if (!sectionId) return;
    try {
      const data = await api.attendance.getSectionJustifications(sectionId);
      setJustifications(data || []);
    } catch (err) {
      console.error("Error loading justifications", err);
    }
  };

  const handleResolveJustification = async (justificationId, status) => {
    try {
      await api.attendance.resolveJustification(justificationId, status);
      showNotification(`Solicitud de justificación ${status === 'APROBADO' ? 'aprobada' : 'rechazada'} correctamente.`);
      await loadJustifications(selectedSection);
      await loadSectionData(selectedSection);
    } catch (err) {
      showNotification('Error al resolver justificación: ' + err.message, 'danger');
    }
  };

  const handleSubmitJustification = async (e) => {
    e.preventDefault();
    if (!submittingJustification) return;

    const attendanceId = submittingJustification.attendanceId;
    const reason = e.target.elements.reason.value;
    const proofFile = e.target.elements.proofFile.files[0];

    if (!reason) {
      showNotification('Por favor ingrese el motivo.', 'danger');
      return;
    }

    try {
      await api.attendance.submitJustification(attendanceId, reason, proofFile);
      showNotification('Solicitud de justificación enviada correctamente.');
      setSubmittingJustification(null);
      await loadSectionData(selectedSection);
    } catch (err) {
      showNotification('Error al enviar justificación: ' + err.message, 'danger');
    }
  };

  const filterSectionsByPeriod = (allSections, period) => {
    let filtered = allSections.filter(s => s.period === period);
    setAvailableSections(filtered);
    setSelectedWeek(1);
    setSelectedStudentFilter('');
    
    if (filtered.length > 0) {
      const firstSectionId = filtered[0].id;
      setSelectedSection(String(firstSectionId));
      loadSectionData(firstSectionId);
    } else {
      setSelectedSection('');
      setEnrollments([]);
      setAttendanceRecords([]);
    }
  };

  const handlePeriodChange = (e) => {
    const period = e.target.value;
    setSelectedPeriod(period);
    filterSectionsByPeriod(sections, period);
  };

  const handleSectionChange = async (e) => {
    const sectionId = e.target.value;
    setSelectedSection(sectionId);
    setSelectedStudentFilter('');
    if (sectionId) {
      await loadSectionData(sectionId);
    } else {
      setEnrollments([]);
      setAttendanceRecords([]);
    }
  };

  // UTP calendar dates logic:
  // 2026-I (S1): Starts mid March (Monday 16 March 2026) -> Ends July (18 weeks)
  // 2026-II (S2): Starts August (Monday 10 August 2026) -> Ends December (18 weeks)
  const getSemesterStartDate = (period) => {
    if (period && period.endsWith('-II')) {
      return new Date(2026, 7, 10); // August 10, 2026
    }
    return new Date(2026, 2, 16); // March 16, 2026 (Alineado con seed.sql)
  };

  const getMondayDateString = (startDate, weekNum) => {
    const monday = new Date(startDate);
    monday.setDate(startDate.getDate() + (weekNum - 1) * 7);
    const year = monday.getFullYear();
    const month = String(monday.getMonth() + 1).padStart(2, '0');
    const day = String(monday.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getWeekRangeString = (startDate, weekNum) => {
    const start = new Date(startDate);
    start.setDate(startDate.getDate() + (weekNum - 1) * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const formatDayMonth = (d) => {
      const day = d.getDate();
      const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
      return `${day} de ${monthNames[d.getMonth()]}`;
    };

    return `${formatDayMonth(start)} al ${formatDayMonth(end)} de 2026`;
  };

  const getWeekRangeStringMobile = (startDate, weekNum) => {
    const start = new Date(startDate);
    start.setDate(startDate.getDate() + (weekNum - 1) * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const formatDayMonthNum = (d) => {
      const day = d.getDate();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${day}/${month}`;
    };

    return `${formatDayMonthNum(start)} al ${formatDayMonthNum(end)}`;
  };

  const getAttendanceRecordForWeek = (studentId, weekNum) => {
    const start = getSemesterStartDate(selectedPeriod);
    const mondayStr = getMondayDateString(start, weekNum);
    const matching = attendanceRecords.filter(att => {
      const isStudentMatch = !studentId || isNaN(studentId) || String(att.studentId) === String(studentId);
      return isStudentMatch && att.date === mondayStr;
    });
    return matching.length > 0 ? matching[matching.length - 1] : null;
  };

  const getStatusForWeek = (studentId, weekNum) => {
    const rec = getAttendanceRecordForWeek(studentId, weekNum);
    return rec ? rec.status : null;
  };

  const handleRecordAttendanceForWeek = async (studentId, weekNum, status) => {
    const start = getSemesterStartDate(selectedPeriod);
    const mondayStr = getMondayDateString(start, weekNum);

    try {
      await api.attendance.record({
        date: mondayStr,
        status,
        sectionId: selectedSection,
        studentId
      });
      showNotification(`Asistencia de la Semana ${weekNum} registrada correctamente.`);
      const atts = await api.attendance.getBySection(selectedSection);
      setAttendanceRecords(atts || []);
    } catch (err) {
      showNotification('Error al registrar asistencia: ' + err.message, 'danger');
    }
  };

  const handleRecordAttendance = async (studentId, status) => {
    await handleRecordAttendanceForWeek(studentId, selectedWeek, status);
  };

  const getAttendanceStats = (studentId) => {
    if (!selectedPeriod) return { present: 0, absent: 0, late: 0, rate: '-' };
    const start = getSemesterStartDate(selectedPeriod);
    
    let present = 0;
    let late = 0;
    let absent = 0;
    let registeredCount = 0;

    for (let weekNum = 1; weekNum <= 18; weekNum++) {
      const mondayStr = getMondayDateString(start, weekNum);
      const matching = attendanceRecords.filter(att => {
        const isStudentMatch = !studentId || isNaN(studentId) || String(att.studentId) === String(studentId);
        return isStudentMatch && att.date === mondayStr;
      });
      if (matching.length > 0) {
        const latestRecord = matching[matching.length - 1];
        if (latestRecord.status === 'PRESENTE' || latestRecord.status === 'JUSTIFICADO') present++;
        else if (latestRecord.status === 'TARDE') late++;
        else if (latestRecord.status === 'AUSENTE') absent++;
        registeredCount++;
      }
    }

    if (registeredCount === 0) return { present: 0, absent: 0, late: 0, rate: '-' };
    const rate = Math.round(((present + late) / registeredCount) * 100);
    return { present, absent, late, rate: `${rate}%` };
  };

  const renderWeeklyCalendarTable = (studentId) => {
    const targetEnr = enrollments.find(e => String(e.studentId) === String(studentId));
    const studentName = targetEnr ? targetEnr.studentUsername : user.username;
    const start = getSemesterStartDate(selectedPeriod);
    const stats = getAttendanceStats(studentId);

    return (
      <div className="glass-card mt-20" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', padding: isMobile ? '16px' : '24px' }}>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: '15px',
          marginBottom: '20px'
        }}>
          <div>
            <h4 style={{ fontFamily: 'var(--font-heading)', color: '#fff', fontSize: isMobile ? '1.05rem' : '1.2rem', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <CalendarCheck size={20} style={{ color: 'hsl(var(--primary))', flexShrink: 0, marginTop: '2px' }} />
              <span>Cronograma de Asistencia ({isMobile ? '18 Sem' : '18 Semanas'}): {studentName}</span>
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginTop: '2px' }}>
              Récord histórico y desglose semanal detallado de asistencia.
            </p>
          </div>
          
          <div style={{ 
            background: 'rgba(255,255,255,0.02)', 
            border: '1px solid var(--border-light)', 
            padding: '10px 18px', 
            borderRadius: '10px', 
            textAlign: isMobile ? 'center' : 'right' 
          }}>
            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', display: 'block', fontWeight: '500' }}>
              Tasa de Asistencia
            </span>
            <span style={{ 
              fontSize: '1.6rem', 
              fontWeight: '800', 
              color: stats.rate !== '-' ? (parseInt(stats.rate) >= 70 ? 'hsl(var(--success))' : 'hsl(var(--danger))') : 'hsl(var(--text-muted))'
            }}>
              {stats.rate}
            </span>
            {stats.rate !== '-' && (
              <span style={{ fontSize: '0.75rem', display: 'block', color: 'hsl(var(--text-muted))', marginTop: '2px' }}>
                Asistencia Calculada
              </span>
            )}
          </div>
        </div>
            <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: isMobile ? '80px' : '120px' }}>{isMobile ? 'Sem.' : 'Semana'}</th>
                <th>Rango de Fechas</th>
                <th style={{ width: '150px', textAlign: 'center' }}>Estado de Asistencia</th>
                {user.role === 'STUDENT' && <th style={{ width: '180px', textAlign: 'center' }}>Justificación</th>}
                {user.role === 'TEACHER' && <th style={{ width: '220px', textAlign: 'center' }}>Registrar / Modificar</th>}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 18 }).map((_, i) => {
                const weekNum = i + 1;
                const weekRange = isMobile ? getWeekRangeStringMobile(start, weekNum) : getWeekRangeString(start, weekNum);
                const rec = getAttendanceRecordForWeek(studentId, weekNum);
                const status = rec ? rec.status : null;
                const justificationStatus = rec ? rec.justificationStatus : null;
                
                return (
                  <tr key={weekNum}>
                    <td style={{ fontWeight: '600' }}>{isMobile ? `Sem. ${weekNum}` : `Semana ${weekNum}`}</td>
                    <td style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>{weekRange}</td>
                    <td style={{ textAlign: 'center' }}>
                      {status === 'PRESENTE' && <span className="badge" style={{ background: 'hsla(142, 71%, 45%, 0.12)', border: '1px solid hsla(142, 71%, 45%, 0.25)', color: 'hsl(142 80% 80%)' }}>Presente</span>}
                      {status === 'AUSENTE' && <span className="badge" style={{ background: 'hsla(0, 84%, 60%, 0.12)', border: '1px solid hsla(0, 84%, 60%, 0.25)', color: 'hsl(0 90% 85%)' }}>Ausente</span>}
                      {status === 'TARDE' && <span className="badge" style={{ background: 'hsla(38, 92%, 50%, 0.12)', border: '1px solid hsla(38, 92%, 50%, 0.25)', color: 'hsl(38 100% 80%)' }}>Tardanza</span>}
                      {status === 'JUSTIFICADO' && <span className="badge" style={{ background: 'hsla(180, 71%, 45%, 0.12)', border: '1px solid hsla(180, 71%, 45%, 0.25)', color: 'hsl(180 80% 80%)' }}>Justificado</span>}
                      {!status && <span className="badge" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-light)', color: 'hsl(var(--text-secondary))' }}>PENDIENTE</span>}
                    </td>
                    {user.role === 'STUDENT' && (
                      <td style={{ textAlign: 'center' }}>
                        {status === 'AUSENTE' && (
                          <>
                            {!justificationStatus && (
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '4px 10px', fontSize: '0.75rem', height: '26px' }}
                                onClick={() => setSubmittingJustification({ attendanceId: rec.id, weekNum })}
                              >
                                Justificar Falta
                              </button>
                            )}
                            {justificationStatus === 'PENDIENTE' && (
                              <span style={{ fontSize: '0.8rem', color: 'hsl(var(--warning))', fontWeight: '500' }}>Pendiente</span>
                            )}
                            {justificationStatus === 'RECHAZADO' && (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'hsl(var(--danger))', fontWeight: '500' }}>Rechazada</span>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '2px 8px', fontSize: '0.7rem', height: '22px' }}
                                  onClick={() => setSubmittingJustification({ attendanceId: rec.id, weekNum })}
                                >
                                  Reintentar
                                </button>
                              </div>
                            )}
                          </>
                        )}
                        {status === 'JUSTIFICADO' && (
                          <span style={{ fontSize: '0.8rem', color: 'hsl(var(--success))', fontWeight: '500' }}>Aprobada</span>
                        )}
                        {status !== 'AUSENTE' && status !== 'JUSTIFICADO' && (
                          <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem' }}>-</span>
                        )}
                      </td>
                    )}
                    {user.role === 'TEACHER' && (
                      <td>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button className="btn btn-secondary" style={{ color: 'hsl(142, 71%, 45%)', padding: '4px 10px', fontSize: '0.8rem', height: '28px' }} onClick={() => handleRecordAttendanceForWeek(studentId, weekNum, 'PRESENTE')} title="Presente">P</button>
                          <button className="btn btn-secondary" style={{ color: 'hsl(0, 84%, 60%)', padding: '4px 10px', fontSize: '0.8rem', height: '28px' }} onClick={() => handleRecordAttendanceForWeek(studentId, weekNum, 'AUSENTE')} title="Ausente">A</button>
                          <button className="btn btn-secondary" style={{ color: 'hsl(38, 92%, 50%)', padding: '4px 10px', fontSize: '0.8rem', height: '28px' }} onClick={() => handleRecordAttendanceForWeek(studentId, weekNum, 'TARDE')} title="Tardanza">T</button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const semesterStart = getSemesterStartDate(selectedPeriod);
  const currentWeekRangeStr = getWeekRangeString(semesterStart, selectedWeek);
  const studentDetailId = user.role === 'STUDENT' 
    ? (selectedStudentFilter || String(user.id || user.userId || '')) 
    : (selectedStudentFilter !== '' ? selectedStudentFilter : null);

  return (
    <div className="glass-card fade-in" style={{ padding: isMobile ? '20px 12px' : '30px', border: '1px solid var(--border-light)', borderRadius: '16px' }}>
      {/* Toast Notification Banner (Positioned top-right to prevent header overlapping) */}
      {notification.message && (
        <div 
          className={`alert alert-${notification.type}`} 
          style={{ 
            position: 'fixed', 
            top: '30px', 
            right: '30px',
            zIndex: 2100, 
            minWidth: '320px',
            textAlign: 'left',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.12)',
            animation: 'fadeIn 0.3s ease'
          }}
        >
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header section */}
      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-light)', 
        paddingBottom: '20px',
        marginBottom: '20px',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CalendarCheck size={28} style={{ color: 'hsl(var(--primary))', flexShrink: 0 }} />
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: isMobile ? '1.4rem' : '1.75rem', fontWeight: '700', color: '#fff', margin: 0 }}>
              Control de Asistencia UTP
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginTop: '2px' }}>
              Gestión académica del registro de puntualidad y asistencia estudiantil.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs for Teacher/Admin */}
      {user.role !== 'STUDENT' && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
          <button 
            onClick={() => setActiveTab('attendance')}
            className="btn"
            style={{
              background: activeTab === 'attendance' ? 'hsla(var(--primary), 0.15)' : 'transparent',
              borderColor: activeTab === 'attendance' ? 'hsl(var(--primary))' : 'transparent',
              color: activeTab === 'attendance' ? '#fff' : 'hsl(var(--text-secondary))',
              borderWidth: '1px',
              borderStyle: 'solid',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
              transition: 'all 0.2s ease'
            }}
          >
            Registro de Asistencia
          </button>
          <button 
            onClick={() => {
              setActiveTab('justifications');
              loadJustifications(selectedSection);
            }}
            className="btn"
            style={{
              background: activeTab === 'justifications' ? 'hsla(var(--primary), 0.15)' : 'transparent',
              borderColor: activeTab === 'justifications' ? 'hsl(var(--primary))' : 'transparent',
              color: activeTab === 'justifications' ? '#fff' : 'hsl(var(--text-secondary))',
              borderWidth: '1px',
              borderStyle: 'solid',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
              transition: 'all 0.2s ease'
            }}
          >
            Solicitudes de Justificación
          </button>
        </div>
      )}

      {/* Premium Filter Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '25px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-light)',
        padding: '20px',
        borderRadius: '12px',
        backdropFilter: 'blur(10px)'
      }}>
        <div>
          <label className="form-label"><Calendar size={13} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} /> Semestre:</label>
          <select className="form-input form-select" value={selectedPeriod} onChange={handlePeriodChange} style={{ marginTop: '6px' }}>
            <option value="">-- Selecciona --</option>
            {periods.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label"><BookOpen size={13} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} /> Asignatura:</label>
          <select className="form-input form-select" value={selectedSection} onChange={handleSectionChange} disabled={!selectedPeriod} style={{ marginTop: '6px' }}>
            <option value="">-- Selecciona --</option>
            {availableSections.map(s => (
              <option key={s.id} value={s.id}>{s.courseName} - {s.code}</option>
            ))}
          </select>
        </div>
        
        {selectedSection && user.role !== 'STUDENT' && activeTab === 'attendance' && (
          <>
            <div>
              <label className="form-label"><User size={13} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} /> Alumno:</label>
              <select className="form-input form-select" value={selectedStudentFilter} onChange={(e) => setSelectedStudentFilter(e.target.value)} style={{ marginTop: '6px' }}>
                <option value="">-- Todos los Alumnos --</option>
                {enrollments.map(enr => (
                  <option key={enr.studentId} value={enr.studentId}>{enr.studentUsername}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label"><Calendar size={13} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} /> Semana a calificar:</label>
              <select className="form-input form-select" value={selectedWeek} onChange={(e) => setSelectedWeek(parseInt(e.target.value))} style={{ marginTop: '6px' }}>
                {Array.from({ length: 18 }).map((_, i) => (
                  <option key={i+1} value={i+1}>Semana {i+1}</option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {selectedSection && (
        <div className="fade-in">
          {activeTab === 'attendance' ? (
            <>
              {/* Main Attendance List (For all students, filtered by week) */}
              {!selectedStudentFilter && user.role !== 'STUDENT' && (
                <div style={{ marginBottom: '35px' }}>
                  <div className="flex-between mb-15" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', padding: '16px 20px', borderRadius: '10px' }}>
                    <div>
                      <strong style={{ color: '#fff', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle size={16} style={{ color: 'hsl(var(--primary))' }} />
                        <span>Semana {selectedWeek}</span>
                      </strong>
                      <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', display: 'block', marginTop: '2px' }}>
                        Rango de clase: {currentWeekRangeStr}
                      </span>
                    </div>
                  </div>
                  
                  {enrollments.length === 0 ? (
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '10px', textAlign: 'center', color: 'hsl(var(--text-muted))', border: '1px solid var(--border-light)' }}>
                      No hay alumnos matriculados en esta sección.
                    </div>
                  ) : (
                    <div className="table-container">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Estudiante</th>
                            <th style={{ width: '180px', textAlign: 'center' }}>Estado Semana {selectedWeek}</th>
                            {user.role === 'TEACHER' && <th style={{ width: '220px', textAlign: 'center' }}>Registrar / Modificar</th>}
                            <th>Récord Acumulado (18 Semanas)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {enrollments.map(enr => {
                            const weekStatus = getStatusForWeek(enr.studentId, selectedWeek);
                            const stats = getAttendanceStats(enr.studentId);
                            
                            return (
                              <tr key={enr.id}>
                                <td style={{ fontWeight: '500' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <User size={14} className="text-muted" />
                                    <span>{enr.studentUsername}</span>
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  {weekStatus === 'PRESENTE' && <span className="badge" style={{ background: 'hsla(142, 71%, 45%, 0.12)', border: '1px solid hsla(142, 71%, 45%, 0.25)', color: 'hsl(142 80% 80%)' }}>Presente</span>}
                                  {weekStatus === 'AUSENTE' && <span className="badge" style={{ background: 'hsla(0, 84%, 60%, 0.12)', border: '1px solid hsla(0, 84%, 60%, 0.25)', color: 'hsl(0 90% 85%)' }}>Ausente</span>}
                                  {weekStatus === 'TARDE' && <span className="badge" style={{ background: 'hsla(38, 92%, 50%, 0.12)', border: '1px solid hsla(38, 92%, 50%, 0.25)', color: 'hsl(38 100% 80%)' }}>Tardanza</span>}
                                  {weekStatus === 'JUSTIFICADO' && <span className="badge" style={{ background: 'hsla(180, 71%, 45%, 0.12)', border: '1px solid hsla(180, 71%, 45%, 0.25)', color: 'hsl(180 80% 80%)' }}>Justificado</span>}
                                  {!weekStatus && <span className="badge" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-light)', color: 'hsl(var(--text-secondary))' }}>PENDIENTE</span>}
                                </td>
                                {user.role === 'TEACHER' && (
                                  <td>
                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                      <button className="btn btn-secondary" style={{ color: 'hsl(142, 71%, 45%)', padding: '6px 12px', fontSize: '0.85rem', height: '32px' }} onClick={() => handleRecordAttendance(enr.studentId, 'PRESENTE')} title="Presente">P</button>
                                      <button className="btn btn-secondary" style={{ color: 'hsl(0, 84%, 60%)', padding: '6px 12px', fontSize: '0.85rem', height: '32px' }} onClick={() => handleRecordAttendance(enr.studentId, 'AUSENTE')} title="Ausente">A</button>
                                      <button className="btn btn-secondary" style={{ color: 'hsl(38, 92%, 50%)', padding: '6px 12px', fontSize: '0.85rem', height: '32px' }} onClick={() => handleRecordAttendance(enr.studentId, 'TARDE')} title="Tardanza">T</button>
                                    </div>
                                  </td>
                                )}
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="badge" style={{ 
                                      background: stats.rate !== '-' ? (parseInt(stats.rate) >= 70 ? 'hsla(142, 71%, 45%, 0.1)' : 'hsla(0, 84%, 60%, 0.1)') : 'rgba(255,255,255,0.02)',
                                      border: stats.rate !== '-' ? (parseInt(stats.rate) >= 70 ? '1px solid hsla(142, 71%, 45%, 0.2)' : '1px solid hsla(0, 84%, 60%, 0.2)') : '1px solid var(--border-light)',
                                      color: stats.rate !== '-' ? (parseInt(stats.rate) >= 70 ? 'hsl(142 80% 80%)' : 'hsl(0 90% 85%)') : 'hsl(var(--text-secondary))',
                                      textTransform: 'none'
                                    }}>
                                      {stats.rate !== '-' ? `${stats.rate} Asistido` : 'Sin datos'}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Detailed 18 weeks Calendar Table (For specific student filter or student role) */}
              {studentDetailId && renderWeeklyCalendarTable(parseInt(studentDetailId))}
            </>
          ) : (
            /* Request Justifications View for Teachers */
            <div style={{ marginBottom: '35px' }} className="fade-in">
              <div className="flex-between mb-15" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', padding: '16px 20px', borderRadius: '10px' }}>
                <div>
                  <strong style={{ color: '#fff', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={16} style={{ color: 'hsl(var(--primary))' }} />
                    <span>Solicitudes de Justificación de Inasistencia</span>
                  </strong>
                  <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', display: 'block', marginTop: '2px' }}>
                    Lista de solicitudes enviadas por los estudiantes para esta sección.
                  </span>
                </div>
              </div>

              {justifications.length === 0 ? (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '30px', borderRadius: '10px', textAlign: 'center', color: 'hsl(var(--text-muted))', border: '1px solid var(--border-light)' }}>
                  No hay solicitudes de justificación registradas en esta sección.
                </div>
              ) : isMobile ? (
                /* Mobile Card Layout for Justifications */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {justifications.map(j => (
                    <div 
                      key={j.id} 
                      style={{ 
                        background: 'rgba(255, 255, 255, 0.02)', 
                        border: '1px solid var(--border-light)', 
                        borderRadius: '12px', 
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '700', color: '#fff', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={15} style={{ color: 'hsl(var(--primary))' }} />
                          {j.studentUsername}
                        </span>
                        <div>
                          {j.status === 'PENDIENTE' && <span className="badge" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-light)', color: 'hsl(var(--text-secondary))' }}>Pendiente</span>}
                          {j.status === 'APROBADO' && <span className="badge" style={{ background: 'hsla(142, 71%, 45%, 0.12)', border: '1px solid hsla(142, 71%, 45%, 0.25)', color: 'hsl(142 80% 80%)' }}>Aprobado</span>}
                          {j.status === 'RECHAZADO' && <span className="badge" style={{ background: 'hsla(0, 84%, 60%, 0.12)', border: '1px solid hsla(0, 84%, 60%, 0.25)', color: 'hsl(0 90% 85%)' }}>Rechazado</span>}
                        </div>
                      </div>

                      <div style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', display: 'flex', gap: '6px' }}>
                        <strong>Fecha de la falta:</strong>
                        <span>{j.attendanceDate}</span>
                      </div>

                      <div style={{ 
                        fontSize: '0.85rem', 
                        color: 'hsl(var(--text-secondary))', 
                        background: 'rgba(255,255,255,0.01)', 
                        border: '1px solid rgba(255,255,255,0.03)',
                        borderRadius: '8px', 
                        padding: '10px 12px',
                        lineHeight: '1.4',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word'
                      }}>
                        <strong>Motivo:</strong>
                        <p style={{ margin: '4px 0 0 0', color: '#fff' }}>{j.reason}</p>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '12px', marginTop: '4px' }}>
                        <div>
                          {j.proofFilePath ? (
                            <a 
                              href={api.getFileUrl(j.proofFilePath)} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.75rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', height: '30px' }}
                            >
                              <Download size={12} />
                              <span>Descargar Evidencia</span>
                            </a>
                          ) : (
                            <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem' }}>Sin prueba adjunta</span>
                          )}
                        </div>

                        <div>
                          {j.status === 'PENDIENTE' ? (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                className="btn btn-secondary" 
                                style={{ color: 'hsl(142, 71%, 45%)', padding: '6px 12px', fontSize: '0.75rem', height: '30px', display: 'inline-flex', alignItems: 'center', gap: '4px' }} 
                                onClick={() => handleResolveJustification(j.id, 'APROBADO')}
                              >
                                <Check size={12} />
                                <span>Aprobar</span>
                              </button>
                              <button 
                                className="btn btn-secondary" 
                                style={{ color: 'hsl(0, 84%, 60%)', padding: '6px 12px', fontSize: '0.75rem', height: '30px', display: 'inline-flex', alignItems: 'center', gap: '4px' }} 
                                onClick={() => handleResolveJustification(j.id, 'RECHAZADO')}
                              >
                                <X size={12} />
                                <span>Rechazar</span>
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem' }}>Resuelta</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Desktop Table Layout for Justifications */
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Estudiante</th>
                        <th style={{ width: '120px', textAlign: 'center' }}>Fecha Falta</th>
                        <th>Motivo</th>
                        <th style={{ width: '140px', textAlign: 'center' }}>Evidencia</th>
                        <th style={{ width: '120px', textAlign: 'center' }}>Estado</th>
                        <th style={{ width: '180px', textAlign: 'center' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {justifications.map(j => (
                        <tr key={j.id}>
                          <td style={{ fontWeight: '500' }}>{j.studentUsername}</td>
                          <td style={{ textAlign: 'center', color: 'hsl(var(--text-secondary))', fontSize: '0.85rem' }}>{j.attendanceDate}</td>
                          <td style={{ fontSize: '0.85rem', whiteSpace: 'normal', wordBreak: 'break-word' }}>{j.reason}</td>
                          <td style={{ textAlign: 'center' }}>
                            {j.proofFilePath ? (
                              <a 
                                href={api.getFileUrl(j.proofFilePath)} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="btn btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.75rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Download size={12} />
                                <span>Descargar</span>
                              </a>
                            ) : (
                              <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem' }}>Sin prueba</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {j.status === 'PENDIENTE' && <span className="badge" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-light)', color: 'hsl(var(--text-secondary))' }}>Pendiente</span>}
                            {j.status === 'APROBADO' && <span className="badge" style={{ background: 'hsla(142, 71%, 45%, 0.12)', border: '1px solid hsla(142, 71%, 45%, 0.25)', color: 'hsl(142 80% 80%)' }}>Aprobado</span>}
                            {j.status === 'RECHAZADO' && <span className="badge" style={{ background: 'hsla(0, 84%, 60%, 0.12)', border: '1px solid hsla(0, 84%, 60%, 0.25)', color: 'hsl(0 90% 85%)' }}>Rechazado</span>}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {j.status === 'PENDIENTE' ? (
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ color: 'hsl(142, 71%, 45%)', padding: '4px 8px', fontSize: '0.75rem', height: '28px', display: 'inline-flex', alignItems: 'center', gap: '2px' }} 
                                  onClick={() => handleResolveJustification(j.id, 'APROBADO')}
                                >
                                  <Check size={12} />
                                  <span>Aprobar</span>
                                </button>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ color: 'hsl(0, 84%, 60%)', padding: '4px 8px', fontSize: '0.75rem', height: '28px', display: 'inline-flex', alignItems: 'center', gap: '2px' }} 
                                  onClick={() => handleResolveJustification(j.id, 'RECHAZADO')}
                                >
                                  <X size={12} />
                                  <span>Rechazar</span>
                                </button>
                              </div>
                            ) : (
                              <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem' }}>Resuelta</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Student Justification Submission Modal */}
      {submittingJustification && (
        <div style={modalOverlayStyle}>
          <div className="glass-card" style={modalContentStyle}>
            <div style={modalHeaderStyle}>
              <h3 style={{ color: '#fff', margin: 0 }}>Solicitar Justificación de Falta</h3>
            </div>
            <form onSubmit={handleSubmitJustification}>
              <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '15px' }}>
                Estás solicitando justificar tu inasistencia de la **Semana {submittingJustification.weekNum}**.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Motivo de la Falta</label>
                  <textarea 
                    name="reason" 
                    className="form-input" 
                    placeholder="Explica detalladamente la razón de tu inasistencia (médica, laboral, etc.)..."
                    style={{ height: '100px', resize: 'vertical' }}
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Adjuntar Evidencia / Comprobante (Opcional)</label>
                  <input 
                    type="file" 
                    name="proofFile" 
                    className="form-input" 
                    style={{ padding: '8px 12px' }} 
                  />
                  <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '4px', display: 'block' }}>
                    Formatos permitidos: PDF, imágenes (PNG, JPG). Máx 20MB.
                  </span>
                </div>
              </div>
              
              <div style={modalFooterStyle}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setSubmittingJustification(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Enviar Solicitud
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Modal styling constants
const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 2000,
  padding: '20px',
  backdropFilter: 'blur(8px)',
};

const modalContentStyle = {
  width: '100%',
  maxWidth: '450px',
  padding: '24px',
  borderRadius: '16px',
  border: '1px solid var(--border-light)',
  background: 'rgba(30, 30, 40, 0.85)',
  backdropFilter: 'blur(20px)',
  boxShadow: 'var(--shadow-premium)',
};

const modalHeaderStyle = {
  marginBottom: '20px',
};

const modalFooterStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
  marginTop: '20px',
};
