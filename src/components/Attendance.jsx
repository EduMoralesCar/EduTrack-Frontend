import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { CalendarCheck, BookOpen, Calendar, User, CheckCircle, TrendingUp } from 'lucide-react';

export default function Attendance({ user }) {
  const [sections, setSections] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [availableSections, setAvailableSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState('');
  
  const [enrollments, setEnrollments] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  
  // Custom states for weekly calendar
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedStudentFilter, setSelectedStudentFilter] = useState(''); // Student filter for teachers
  const [notification, setNotification] = useState({ message: '', type: '' });

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
    } catch (err) {
      console.error(err);
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

  const getStatusForWeek = (studentId, weekNum) => {
    const start = getSemesterStartDate(selectedPeriod);
    const mondayStr = getMondayDateString(start, weekNum);
    const matching = attendanceRecords.filter(att => {
      const isStudentMatch = !studentId || isNaN(studentId) || String(att.studentId) === String(studentId);
      return isStudentMatch && att.date === mondayStr;
    });
    return matching.length > 0 ? matching[matching.length - 1].status : null; // Get latest status to support updates
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
        if (latestRecord.status === 'PRESENTE') present++;
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
      <div className="glass-card mt-20" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', padding: '24px' }}>
        <div className="flex-between mb-20" style={{ flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h4 style={{ fontFamily: 'var(--font-heading)', color: '#fff', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarCheck size={20} style={{ color: 'hsl(var(--primary))' }} />
              <span>Cronograma de Asistencia (18 Semanas): {studentName}</span>
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginTop: '2px' }}>
              Récord histórico y desglose semanal detallado de asistencia.
            </p>
          </div>
          
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', padding: '10px 18px', borderRadius: '10px', textAlign: 'right' }}>
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
                <th style={{ width: '120px' }}>Semana</th>
                <th>Rango de Fechas</th>
                <th style={{ width: '150px', textAlign: 'center' }}>Estado de Asistencia</th>
                {user.role === 'TEACHER' && <th style={{ width: '220px', textAlign: 'center' }}>Registrar / Modificar</th>}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 18 }).map((_, i) => {
                const weekNum = i + 1;
                const weekRange = getWeekRangeString(start, weekNum);
                const status = getStatusForWeek(studentId, weekNum);
                
                return (
                  <tr key={weekNum}>
                    <td style={{ fontWeight: '600' }}>Semana {weekNum}</td>
                    <td style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>{weekRange}</td>
                    <td style={{ textAlign: 'center' }}>
                      {status === 'PRESENTE' && <span className="badge" style={{ background: 'hsla(142, 71%, 45%, 0.12)', border: '1px solid hsla(142, 71%, 45%, 0.25)', color: 'hsl(142 80% 80%)' }}>Presente</span>}
                      {status === 'AUSENTE' && <span className="badge" style={{ background: 'hsla(0, 84%, 60%, 0.12)', border: '1px solid hsla(0, 84%, 60%, 0.25)', color: 'hsl(0 90% 85%)' }}>Ausente</span>}
                      {status === 'TARDE' && <span className="badge" style={{ background: 'hsla(38, 92%, 50%, 0.12)', border: '1px solid hsla(38, 92%, 50%, 0.25)', color: 'hsl(38 100% 80%)' }}>Tardanza</span>}
                      {!status && <span className="badge" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-light)', color: 'hsl(var(--text-secondary))' }}>PENDIENTE</span>}
                    </td>
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
    <div className="glass-card fade-in" style={{ padding: '30px', border: '1px solid var(--border-light)', borderRadius: '16px' }}>
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
      <div className="flex-between mb-20" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CalendarCheck size={28} style={{ color: 'hsl(var(--primary))' }} />
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: '700', color: '#fff', margin: 0 }}>
              Control de Asistencia UTP
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', marginTop: '2px' }}>
              Gestión académica del registro de puntualidad y asistencia estudiantil.
            </p>
          </div>
        </div>
      </div>

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
        
        {selectedSection && user.role !== 'STUDENT' && (
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
        </div>
      )}
    </div>
  );
}
