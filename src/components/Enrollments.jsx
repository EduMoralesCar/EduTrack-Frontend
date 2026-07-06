import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { UserCheck, Plus, Trash2, ShieldAlert, CheckCircle, GraduationCap, ArrowRight, BookOpen } from 'lucide-react';

export default function Enrollments({ user }) {
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [enrollments, setEnrollments] = useState([]);
  const [students, setStudents] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const [loading, setLoading] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Enrollment Modal States (Admin Only)
  const [showModal, setShowModal] = useState(false);
  const [enrollStudentId, setEnrollStudentId] = useState('');

  const isAdmin = user.role === 'ADMIN';
  const isTeacher = user.role === 'TEACHER';

  // Load initial sections based on role
  const loadSections = async () => {
    setSectionsLoading(true);
    setError('');
    try {
      const allSections = await api.sections.getAll();
      
      let filtered = allSections || [];
      if (isTeacher) {
        // Filter sections where this teacher is assigned
        filtered = allSections.filter(sec => sec.teacherUsername === user.username);
      }
      
      setSections(filtered);
      
      // Auto select the first section if available
      if (filtered.length > 0) {
        setSelectedSectionId(filtered[0].id.toString());
      }
    } catch (err) {
      setError(err.message || 'Error al obtener la lista de secciones');
    } finally {
      setSectionsLoading(false);
    }
  };

  // Load students for registration dropdown (Admin Only)
  const loadStudents = async () => {
    if (!isAdmin) return;
    try {
      const allUsers = await api.users.getAll();
      const studentUsers = allUsers.filter(u => u.role === 'STUDENT' && u.isActive !== false);
      setStudents(studentUsers || []);
      if (studentUsers.length > 0) {
        setEnrollStudentId(studentUsers[0].id.toString());
      }
    } catch (err) {
      console.error('Error al cargar lista de estudiantes:', err);
    }
  };

  useEffect(() => {
    loadSections();
    loadStudents();
  }, []);

  // Fetch enrollments whenever the selected section changes
  const fetchEnrollments = async (sectionId) => {
    if (!sectionId) {
      setEnrollments([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await api.enrollments.getBySectionId(parseInt(sectionId));
      setEnrollments(data || []);
    } catch (err) {
      setError(err.message || 'Error al cargar los estudiantes matriculados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSectionId) {
      fetchEnrollments(selectedSectionId);
    }
  }, [selectedSectionId]);

  const handleSectionChange = (e) => {
    setSelectedSectionId(e.target.value);
    setSuccess('');
    setError('');
  };

  const openEnrollModal = () => {
    if (!isAdmin) return;
    if (!selectedSectionId) {
      setError('Por favor, cree o seleccione una sección primero');
      return;
    }
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const handleEnrollSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!enrollStudentId || !selectedSectionId) {
      setError('Por favor complete todos los datos');
      return;
    }

    setError('');
    setSuccess('');

    try {
      await api.enrollments.enroll(parseInt(enrollStudentId), parseInt(selectedSectionId));
      setSuccess('Estudiante matriculado exitosamente en la sección');
      setShowModal(false);
      fetchEnrollments(selectedSectionId);
    } catch (err) {
      setError(err.message || 'Error al matricular el estudiante. ¿Ya se encuentra matriculado?');
    }
  };

  const handleUnenroll = async (enrollmentId, studentName) => {
    if (!isAdmin) return;
    if (!window.confirm(`¿Está seguro que desea anular la matrícula del estudiante "${studentName}" de esta sección?`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await api.enrollments.unenroll(enrollmentId);
      setSuccess('Matrícula anulada exitosamente');
      fetchEnrollments(selectedSectionId);
    } catch (err) {
      setError(err.message || 'Error al anular la matrícula');
    }
  };

  const getSelectedSectionDetails = () => {
    const sec = sections.find(s => s.id.toString() === selectedSectionId);
    return sec ? `${sec.courseName} - Sección ${sec.code} (${sec.period})` : '';
  };

  return (
    <div style={styles.container}>
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'space-between',
        gap: isMobile ? '16px' : '0px',
        marginBottom: '20px',
      }}>
        <div>
          <h2 style={styles.pageTitle}>Control de Matrículas</h2>
          <p style={styles.pageSubtitle}>Listado de alumnos matriculados y control de ingresos por sección</p>
        </div>
        {isAdmin && sections.length > 0 && (
          <button className="btn btn-primary" onClick={openEnrollModal} style={isMobile ? { justifyContent: 'center' } : {}}>
            <Plus size={18} />
            <span>Matricular Estudiante</span>
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger">
          <ShieldAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Section Selection Bar */}
      <div className="glass-card" style={styles.filterCard}>
        <div style={{
          ...styles.filterGroup,
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: isMobile ? '8px' : '12px',
        }}>
          <label className="form-label" style={{ marginBottom: 0, marginRight: isMobile ? '0px' : '12px' }}>
            Seleccionar Sección:
          </label>
          {sectionsLoading ? (
            <span style={styles.smallLoader}></span>
          ) : (
            <select
              className="form-input form-select"
              value={selectedSectionId}
              onChange={handleSectionChange}
              style={{
                ...styles.selectFilter,
                maxWidth: isMobile ? '100%' : '450px',
              }}
            >
              {sections.length === 0 ? (
                <option value="">-- No hay secciones disponibles --</option>
              ) : (
                sections.map(sec => (
                  <option key={sec.id} value={sec.id}>
                    {sec.courseCode} - {sec.courseName} [Sección {sec.code}] ({sec.period})
                  </option>
                ))
              )}
            </select>
          )}
        </div>
      </div>

      {/* Roster list */}
      {!selectedSectionId ? (
        <div className="glass-card text-center" style={styles.emptyCard}>
          <BookOpen size={48} style={{ color: 'hsl(var(--text-muted))', marginBottom: '12px' }} />
          <h3>Seleccione una sección académica</h3>
          <p>Para ver los alumnos matriculados o gestionar admisiones, elija un curso del panel superior.</p>
        </div>
      ) : loading ? (
        <div style={styles.loaderContainer}>
          <div style={styles.spinner}></div>
          <span style={{ marginLeft: '12px' }}>Cargando padrón de matriculados...</span>
        </div>
      ) : (
        <div style={styles.rosterSection}>
          <div style={{
            ...styles.rosterHeader,
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: isMobile ? '8px' : '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GraduationCap size={20} color="hsl(263, 90%, 60%)" style={{ flexShrink: 0 }} />
              <h3 style={{ ...styles.rosterTitle, fontSize: isMobile ? '1.1rem' : '1.25rem' }}>{getSelectedSectionDetails()}</h3>
            </div>
            <span className="badge badge-student" style={{ ...styles.rosterCount, marginLeft: isMobile ? '0px' : 'auto' }}>
              {enrollments.length} {enrollments.length === 1 ? 'Alumno' : 'Alumnos'}
            </span>
          </div>

          {isMobile ? (
            <div style={styles.mobileListContainer}>
              {enrollments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'hsl(var(--text-muted))' }}>
                  No hay estudiantes matriculados en esta sección académica.
                </div>
              ) : (
                enrollments.map((enr) => (
                  <div key={enr.id} className="glass-card" style={styles.mobileCard}>
                    <div style={styles.mobileCardHeader}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={styles.mobileCardTitle}>{enr.studentUsername}</div>
                        <div style={styles.mobileCardSubtitle}>Matrícula: #{enr.id} • Alumno: ID-{enr.studentId}</div>
                      </div>
                      <div>
                        {isAdmin || isTeacher ? (
                          <select
                            value={enr.status || 'ENROLLED'}
                            onChange={async (e) => {
                              const newStatus = e.target.value;
                              try {
                                setError('');
                                setSuccess('');
                                await api.enrollments.updateStatus(enr.id, newStatus);
                                setSuccess(`Estado de ${enr.studentUsername} actualizado a ${newStatus}`);
                                fetchEnrollments(selectedSectionId);
                              } catch (err) {
                                setError(err.message || 'Error al actualizar el estado');
                              }
                            }}
                            className="form-input form-select"
                            style={{
                              padding: '4px 6px',
                              fontSize: '0.8rem',
                              background: 'rgba(255,255,255,0.05)',
                              color: '#fff',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '6px',
                              width: '110px'
                            }}
                          >
                            <option value="ENROLLED" style={{ backgroundColor: '#1e1e2f', color: '#fff' }}>ACTIVO</option>
                            <option value="AT_RISK" style={{ backgroundColor: '#1e1e2f', color: '#fff' }}>OBSERVADO</option>
                            <option value="WITHDRAWN" style={{ backgroundColor: '#1e1e2f', color: '#fff' }}>RETIRADO</option>
                          </select>
                        ) : (
                          <span style={
                            enr.status === 'AT_RISK' ? { ...styles.enrolledStatus, color: 'hsl(0, 84%, 65%)' } :
                            enr.status === 'WITHDRAWN' ? { ...styles.enrolledStatus, color: '#aaa' } : styles.enrolledStatus
                          }>
                            {enr.status === 'AT_RISK' ? 'OBSERVADO' : (enr.status === 'WITHDRAWN' ? 'RETIRADO' : 'ACTIVO')}
                          </span>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <div style={styles.mobileCardFooter}>
                        <button
                          onClick={() => handleUnenroll(enr.id, enr.studentUsername)}
                          className="btn btn-danger"
                          style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', width: '100%', justifyContent: 'center', color: '#fff' }}
                        >
                          <Trash2 size={14} />
                          <span>Dar de Baja / Retirar</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>ID Matrícula</th>
                    <th>ID Alumno</th>
                    <th>Nombre del Estudiante</th>
                    <th>Estado Matrícula</th>
                    {isAdmin && <th style={{ textAlign: 'right' }}>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {enrollments.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 5 : 4} style={{ textAlign: 'center', padding: '40px 0', color: 'hsl(var(--text-muted))' }}>
                        No hay estudiantes matriculados en esta sección académica.
                      </td>
                    </tr>
                  ) : (
                    enrollments.map((enr) => (
                      <tr key={enr.id}>
                        <td>#{enr.id}</td>
                        <td>ID-{enr.studentId}</td>
                        <td style={{ fontWeight: '600' }}>{enr.studentUsername}</td>
                        <td>
                          {isAdmin || isTeacher ? (
                            <select
                              value={enr.status || 'ENROLLED'}
                              onChange={async (e) => {
                                const newStatus = e.target.value;
                                try {
                                  setError('');
                                  setSuccess('');
                                  await api.enrollments.updateStatus(enr.id, newStatus);
                                  setSuccess(`Estado del alumno ${enr.studentUsername} actualizado a ${newStatus}`);
                                  fetchEnrollments(selectedSectionId);
                                } catch (err) {
                                  setError(err.message || 'Error al actualizar el estado académico');
                                }
                              }}
                              className="form-input form-select"
                              style={{
                                padding: '4px 8px',
                                fontSize: '0.85rem',
                                background: 'rgba(255,255,255,0.05)',
                                color: '#fff',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                width: '130px',
                              }}
                            >
                              <option value="ENROLLED" style={{ backgroundColor: '#1e1e2f', color: '#fff' }}>ACTIVO</option>
                              <option value="AT_RISK" style={{ backgroundColor: '#1e1e2f', color: '#fff' }}>OBSERVADO</option>
                              <option value="WITHDRAWN" style={{ backgroundColor: '#1e1e2f', color: '#fff' }}>RETIRADO</option>
                            </select>
                          ) : (
                            <span style={
                              enr.status === 'AT_RISK' ? { ...styles.enrolledStatus, color: 'hsl(0, 84%, 65%)' } :
                              enr.status === 'WITHDRAWN' ? { ...styles.enrolledStatus, color: '#aaa' } : styles.enrolledStatus
                            }>
                              <CheckCircle size={14} style={{ marginRight: '4px' }} />
                              {enr.status === 'AT_RISK' ? 'OBSERVADO' : (enr.status === 'WITHDRAWN' ? 'RETIRADO' : 'ACTIVO')}
                            </span>
                          )}
                        </td>
                        {isAdmin && (
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => handleUnenroll(enr.id, enr.studentUsername)}
                              className="btn btn-danger"
                              style={styles.unenrollBtn}
                              title="Anular Matrícula"
                            >
                              <Trash2 size={14} />
                              <span>Dar de Baja</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Admin Enrollment Modal */}
      {showModal && isAdmin && selectedSectionId && (
        <div style={styles.modalOverlay}>
          <div className="glass-card" style={styles.modalContent}>
            <div className="flex-between mb-20" style={styles.modalHeader}>
              <h3>Matricular Alumno</h3>
              <button onClick={() => setShowModal(false)} style={styles.closeBtn}>✕</button>
            </div>

            <div style={styles.sectionLabelContainer}>
              <span style={styles.sectionLabelHeader}>Sección de Destino:</span>
              <span style={styles.sectionLabelBody}>{getSelectedSectionDetails()}</span>
            </div>

            <form onSubmit={handleEnrollSubmit} style={styles.modalForm}>
              <div className="form-group">
                <label className="form-label">Seleccione el Estudiante *</label>
                <select
                  className="form-input form-select"
                  value={enrollStudentId}
                  onChange={(e) => setEnrollStudentId(e.target.value)}
                  required
                >
                  {students.length === 0 ? (
                    <option value="">-- No hay estudiantes activos --</option>
                  ) : (
                    students.map(s => (
                      <option key={s.id} value={s.id}>{s.username} ({s.email})</option>
                    ))
                  )}
                </select>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={students.length === 0}>
                  <span>Confirmar Matrícula</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
  },
  pageTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#fff',
    marginBottom: '4px',
  },
  pageSubtitle: {
    fontSize: '0.9rem',
    color: 'hsl(var(--text-secondary))',
  },
  loaderContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 0',
    color: 'hsl(var(--text-secondary))',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '3px solid rgba(255, 255, 255, 0.1)',
    borderTopColor: 'hsl(var(--primary))',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  smallLoader: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255, 255, 255, 0.1)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    display: 'inline-block',
  },
  filterCard: {
    padding: '16px 20px',
    marginBottom: '24px',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  selectFilter: {
    maxWidth: '450px',
    flexGrow: 1,
  },
  emptyCard: {
    padding: '60px 20px',
  },
  rosterSection: {
    animation: 'slideIn 0.3s ease',
  },
  rosterHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
    textAlign: 'left',
  },
  rosterTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#fff',
  },
  rosterCount: {
    fontSize: '0.8rem',
  },
  enrolledStatus: {
    display: 'inline-flex',
    alignItems: 'center',
    color: '#2ecc71',
    fontWeight: '500',
    fontSize: '0.85rem',
  },
  unenrollBtn: {
    padding: '6px 12px',
    fontSize: '0.8rem',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 7, 12, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(8px)',
  },
  modalContent: {
    width: '90%',
    maxWidth: '480px',
    border: '1px solid rgba(255,255,255,0.12)',
    animation: 'slideIn 0.3s ease',
    boxSizing: 'border-box',
  },
  mobileListContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%',
  },
  mobileCard: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    border: '1px solid var(--border-light)',
  },
  mobileCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '10px',
  },
  mobileCardTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'var(--font-heading)',
  },
  mobileCardSubtitle: {
    fontSize: '0.8rem',
    color: 'hsl(var(--text-muted))',
    marginTop: '2px',
  },
  mobileCardFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    borderTop: '1px solid rgba(255,255,255,0.03)',
    paddingTop: '10px',
    marginTop: '4px',
  },
  modalHeader: {
    borderBottom: '1px solid var(--border-light)',
    paddingBottom: '12px',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  sectionLabelContainer: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-light)',
    borderRadius: '10px',
    padding: '12px',
    marginBottom: '20px',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  sectionLabelHeader: {
    fontSize: '0.8rem',
    color: 'hsl(var(--text-muted))',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: '600',
  },
  sectionLabelBody: {
    color: '#fff',
    fontSize: '0.95rem',
    fontWeight: '600',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '20px',
    borderTop: '1px solid var(--border-light)',
    paddingTop: '16px',
  }
};
