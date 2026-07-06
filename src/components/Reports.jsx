import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { FileText, ShieldAlert, Award, Calendar, AlertTriangle, Users, BookOpen, RefreshCw, Activity } from 'lucide-react';

export default function Reports({ user }) {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadReport = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.reports.getAcademicReport();
      setReportData(data);
    } catch (err) {
      setError(err.message || 'Error al cargar el reporte académico institucional');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(255,255,255,0.05)',
          borderTopColor: 'hsl(263, 90%, 51%)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <span style={{ color: 'hsl(var(--text-muted))' }}>Generando reporte académico...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '12px' }}>
        <ShieldAlert size={20} />
        <div style={{ flexGrow: 1 }}>
          <h4 style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>Error de Reporte</h4>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>{error}</p>
        </div>
        <button onClick={loadReport} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Reintentar</button>
      </div>
    );
  }

  if (!reportData) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Top Banner & Quick Refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#fff', margin: 0 }}>Reportes de Rendimiento y Riesgo Institucional</h3>
          <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', margin: '4px 0 0 0' }}>Estadísticas consolidadas para la toma de decisiones y alertas preventivas.</p>
        </div>
        <button onClick={loadReport} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={14} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Metric Cards grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
        gap: '20px'
      }}>
        {/* Total Students Card */}
        <div className="glass-card" style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '50%', color: '#fff' }}>
            <Users size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Alumnos Evaluados</span>
            <span style={{ fontSize: '1.6rem', fontWeight: '700', color: '#fff' }}>{reportData.totalStudents}</span>
          </div>
        </div>

        {/* Active Students Card */}
        <div className="glass-card" style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'hsla(142, 71%, 45%, 0.1)', padding: '12px', borderRadius: '50%', color: 'hsl(142, 71%, 55%)' }}>
            <Users size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Alumnos Activos</span>
            <span style={{ fontSize: '1.6rem', fontWeight: '700', color: '#fff' }}>{reportData.activeStudentsCount}</span>
          </div>
        </div>

        {/* Observed Students Card */}
        <div className="glass-card" style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'hsla(0, 84%, 60%, 0.1)', padding: '12px', borderRadius: '50%', color: 'hsl(0, 84%, 65%)' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Alumnos en Riesgo</span>
            <span style={{ fontSize: '1.6rem', fontWeight: '700', color: '#fff' }}>{reportData.observedStudentsCount}</span>
          </div>
        </div>

        {/* Overall Attendance Card */}
        <div className="glass-card" style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'hsla(263, 90%, 51%, 0.1)', padding: '12px', borderRadius: '50%', color: 'hsl(263, 90%, 65%)' }}>
            <Calendar size={22} />
          </div>
          <div style={{ flexGrow: 1 }}>
            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Asistencia Global</span>
            <span style={{ fontSize: '1.6rem', fontWeight: '700', color: '#fff' }}>{reportData.overallAttendanceRate}%</span>
            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
              <div style={{ width: `${reportData.overallAttendanceRate}%`, height: '100%', background: 'linear-gradient(90deg, hsl(263, 90%, 51%), hsl(142, 71%, 45%))' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Analysis Sections */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '3fr 2fr',
        gap: '24px'
      }}>
        {/* Left column: Students at Risk list */}
        <div className="glass-card" style={{ padding: '24px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
            <AlertTriangle size={20} color="hsl(0, 84%, 60%)" />
            <h4 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fff', margin: 0 }}>Listado de Estudiantes en Riesgo Académico (RF14)</h4>
          </div>

          <div style={{ overflowX: 'auto' }}>
            {reportData.studentsAtRisk.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                ¡Excelente! No hay alumnos en riesgo registrados actualmente.
              </div>
            ) : (
              <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)', textAlign: 'left' }}>
                    <th style={{ padding: '10px' }}>Estudiante</th>
                    <th style={{ padding: '10px' }}>Sección / Curso</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Promedio</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Asistencia</th>
                    <th style={{ padding: '10px' }}>Detalle del Factor de Riesgo</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.studentsAtRisk.map(s => (
                    <tr key={`${s.studentId}-${s.sectionCode}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ fontWeight: '600', color: '#fff' }}>{s.username}</div>
                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{s.email}</div>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ color: 'hsl(263, 90%, 75%)', fontWeight: '500' }}>{s.sectionCode}</div>
                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.courseName}</div>
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 'bold', color: s.finalAverage != null && s.finalAverage < 11.5 ? 'hsl(0, 84%, 60%)' : '#fff' }}>
                        {s.finalAverage != null ? s.finalAverage.toFixed(2) : '-'}
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 'bold', color: s.attendanceRate < 70.0 ? 'hsl(0, 84%, 60%)' : '#fff' }}>
                        {s.attendanceRate != null ? `${s.attendanceRate.toFixed(1)}%` : '-'}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(239, 68, 68, 0.08)',
                          color: 'hsl(0, 84%, 65%)',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          border: '1px solid rgba(239, 68, 68, 0.15)'
                        }}>
                          {s.riskReason}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right column: Critical courses and risk distributions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Critical Courses Panel */}
          <div className="glass-card" style={{ padding: '24px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
              <BookOpen size={20} color="hsl(263, 90%, 65%)" />
              <h4 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fff', margin: 0 }}>Cursos Críticos (Riesgo Académico)</h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {reportData.criticalCourses.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'hsl(var(--text-muted))', padding: '15px 0' }}>
                  No hay asignaturas críticas registradas.
                </div>
              ) : (
                reportData.criticalCourses.map(cc => (
                  <div key={cc.sectionId} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#fff' }}>{cc.courseName} ({cc.sectionCode})</span>
                      <span style={{ fontSize: '0.8rem', color: 'hsl(0, 84%, 65%)', fontWeight: 'bold' }}>{cc.riskPercentage}% Riesgo</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                      <div style={{ width: `${cc.riskPercentage}%`, height: '100%', background: 'hsl(0, 84%, 60%)', borderRadius: '4px' }}></div>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
                      {cc.atRiskCount} de {cc.totalStudents} estudiantes en estado observado / en riesgo.
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Academic Actions Summary */}
          <div className="glass-card" style={{ padding: '24px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.03), rgba(255,255,255,0.01))' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#fff', margin: '0 0 10px 0' }}>Resumen de Auditorías del Sistema</h4>
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>
                <strong>Cálculo de Promedios (RF11):</strong> Evaluado automáticamente usando la fórmula ponderada oficial de UTP (PC1, PC2, PC3, PA, EXFINAL).
              </li>
              <li>
                <strong>Detección de Alumnos en Riesgo (RF14):</strong> Gatillado automáticamente al registrar notas desaprobadas (promedio final &lt; 11.5) o inasistencias recurrentes (asistencia acumulada &lt; 70%).
              </li>
              <li>
                <strong>Notificaciones en tiempo real (RF16):</strong> Despachadas inmediatamente a las bandejas del estudiante en cada cambio.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
