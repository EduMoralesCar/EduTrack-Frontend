import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Layers, Plus, Edit2, Trash2, UserPlus, CheckCircle, ShieldAlert, BookOpen, Clock, User } from 'lucide-react';

export default function Sections({ user }) {
  const [sections, setSections] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals & Forms States
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  
  const [courseId, setCourseId] = useState('');
  const [period, setPeriod] = useState('2026-I');
  const [code, setCode] = useState('');

  // Teacher Assignment Modal States
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [assignSectionId, setAssignSectionId] = useState(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  const isAdmin = user.role === 'ADMIN';
  const isTeacher = user.role === 'TEACHER';
  const isStudent = user.role === 'STUDENT';

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const sectionsData = await api.sections.getAll();
      
      if (isStudent) {
        const studentEnrollments = await api.enrollments.getMyEnrollments();
        const enrolledSectionIds = studentEnrollments.map(enr => enr.sectionId);
        const studentSections = (sectionsData || []).filter(sec => enrolledSectionIds.includes(sec.id));
        setSections(studentSections);
      } else if (isTeacher) {
        const teacherSections = (sectionsData || []).filter(sec => sec.teacherUsername === user.username);
        setSections(teacherSections);
      } else {
        setSections(sectionsData || []);
      }
      
      if (isAdmin) {
        const coursesData = await api.courses.getAll();
        setCourses(coursesData || []);
        
        const allUsers = await api.users.getAll();
        const teacherUsers = allUsers.filter(u => u.role === 'TEACHER' && u.isActive !== false);
        setTeachers(teacherUsers || []);
      }
    } catch (err) {
      setError(err.message || 'Error al cargar datos de secciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateSectionModal = () => {
    if (!isAdmin) return;
    setIsEditing(false);
    setSelectedSectionId(null);
    setCourseId(courses[0]?.id || '');
    setPeriod('2026-I');
    setCode('');
    setError('');
    setSuccess('');
    setShowSectionModal(true);
  };

  const openEditSectionModal = (targetSection) => {
    if (!isAdmin) return;
    setIsEditing(true);
    setSelectedSectionId(targetSection.id);
    setCourseId(targetSection.courseId);
    setPeriod(targetSection.period);
    setCode(targetSection.code);
    setError('');
    setSuccess('');
    setShowSectionModal(true);
  };

  const openAssignTeacherModal = (sectionId, currentTeacherId) => {
    if (!isAdmin) return;
    setAssignSectionId(sectionId);
    setSelectedTeacherId(currentTeacherId || '');
    setError('');
    setSuccess('');
    setShowTeacherModal(true);
  };

  const handleDeleteSection = async (id, sectionCode, courseName) => {
    if (!isAdmin) return;
    if (!window.confirm(`¿Está seguro que desea eliminar la sección "${sectionCode}" del curso "${courseName}"? Se perderán las matrículas vinculadas.`)) {
      return;
    }

    try {
      await api.sections.delete(id);
      setSuccess('Sección eliminada con éxito');
      fetchData();
    } catch (err) {
      setError(err.message || 'Error al eliminar sección');
    }
  };

  const handleSectionSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!courseId || !period || !code) {
      setError('Por favor complete todos los campos');
      return;
    }

    setError('');
    setSuccess('');

    try {
      const sectionData = { courseId: parseInt(courseId), period, code };
      if (isEditing) {
        await api.sections.update(selectedSectionId, sectionData);
        setSuccess('Sección actualizada con éxito');
      } else {
        await api.sections.create(sectionData);
        setSuccess('Sección creada con éxito');
      }
      setShowSectionModal(false);
      fetchData();
    } catch (err) {
      setError(err.message || 'Error al guardar la sección');
    }
  };

  const handleTeacherAssignSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!selectedTeacherId) {
      setError('Por favor seleccione un docente');
      return;
    }

    setError('');
    setSuccess('');

    try {
      await api.sections.assignTeacher(assignSectionId, parseInt(selectedTeacherId));
      setSuccess('Docente asignado con éxito a la sección');
      setShowTeacherModal(false);
      fetchData();
    } catch (err) {
      setError(err.message || 'Error al asignar docente');
    }
  };

  const filteredSections = sections;

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
          <h2 style={styles.pageTitle}>
            {isAdmin ? 'Gestión de Secciones' : isTeacher ? 'Mis Secciones a Cargo' : 'Secciones Académicas'}
          </h2>
          <p style={styles.pageSubtitle}>Administración y organización de clases por periodo académico y docente</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreateSectionModal} style={isMobile ? { justifyContent: 'center' } : {}}>
            <Plus size={18} />
            <span>Nueva Sección</span>
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

      {loading ? (
        <div style={styles.loaderContainer}>
          <div style={styles.spinner}></div>
          <span style={{ marginLeft: '12px' }}>Cargando secciones académicas...</span>
        </div>
      ) : (
        isMobile ? (
          <div style={styles.mobileListContainer}>
            {filteredSections.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'hsl(var(--text-muted))' }}>
                {isTeacher 
                  ? 'No tiene secciones asignadas para este periodo.' 
                  : isStudent 
                    ? 'No se encuentra matriculado en ninguna sección para este periodo.' 
                    : 'No hay secciones creadas en el sistema.'}
              </div>
            ) : (
              filteredSections.map((sec) => (
                <div key={sec.id} className="glass-card" style={styles.mobileCard}>
                  <div style={styles.mobileCardHeader}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexGrow: 1 }}>
                      <div style={styles.mobileCardTitle}>{sec.courseName}</div>
                      <div style={styles.mobileCardSubtitle}>Sección {sec.code} • <span style={styles.codeTag}>{sec.courseCode}</span></div>
                    </div>
                    <div>
                      <span style={styles.periodTag}>
                        <Clock size={11} style={{ marginRight: '4px' }} />
                        {sec.period}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '4px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>Docente: </span>
                    {sec.teacherUsername ? (
                      <span style={styles.teacherSpan}>
                        <User size={13} style={{ marginRight: '4px', verticalAlign: 'middle', display: 'inline' }} />
                        {sec.teacherUsername}
                      </span>
                    ) : (
                      <span style={styles.noTeacherSpan}>Sin asignar</span>
                    )}
                  </div>

                  {isAdmin && (
                    <div style={styles.mobileCardFooter}>
                      <div style={styles.actionContainerMobile}>
                        <button
                          onClick={() => openAssignTeacherModal(sec.id, sec.teacherId)}
                          className="btn btn-secondary"
                          style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', flex: 1, justifyContent: 'center' }}
                        >
                          <UserPlus size={14} />
                          <span>Asignar</span>
                        </button>
                        <button
                          onClick={() => openEditSectionModal(sec)}
                          className="btn btn-secondary"
                          style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteSection(sec.id, sec.code, sec.courseName)}
                          className="btn"
                          style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(231, 76, 60, 0.15)', border: '1px solid rgba(231, 76, 60, 0.3)', color: '#e74c3c', justifyContent: 'center' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
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
                  <th>Sección</th>
                  <th>Curso</th>
                  <th>Código Curso</th>
                  <th>Docente Asignado</th>
                  <th>Periodo</th>
                  {isAdmin && <th style={{ textAlign: 'right' }}>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filteredSections.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', padding: '40px 0', color: 'hsl(var(--text-muted))' }}>
                      {isTeacher 
                        ? 'No tiene secciones asignadas para este periodo.' 
                        : isStudent 
                          ? 'No se encuentra matriculado en ninguna sección para este periodo.' 
                          : 'No hay secciones creadas en el sistema.'}
                    </td>
                  </tr>
                ) : (
                  filteredSections.map((sec) => (
                    <tr key={sec.id}>
                      <td style={{ fontWeight: '600', color: 'hsl(var(--primary-hover))' }}>Sección {sec.code}</td>
                      <td style={{ fontWeight: '500' }}>{sec.courseName}</td>
                      <td><span style={styles.codeTag}>{sec.courseCode}</span></td>
                      <td>
                        {sec.teacherUsername ? (
                          <span style={styles.teacherSpan}>
                            <User size={14} style={{ marginRight: '6px' }} />
                            {sec.teacherUsername}
                          </span>
                        ) : (
                          <span style={styles.noTeacherSpan}>Sin Docente Asignado</span>
                        )}
                      </td>
                      <td>
                        <span style={styles.periodTag}>
                          <Clock size={12} style={{ marginRight: '4px' }} />
                          {sec.period}
                        </span>
                      </td>
                      {isAdmin && (
                        <td style={{ textAlign: 'right' }}>
                          <div style={styles.actionContainer}>
                            <button
                              onClick={() => openAssignTeacherModal(sec.id, sec.teacherId)}
                              className="btn btn-secondary"
                              style={styles.actionBtn}
                              title="Asignar Docente"
                            >
                              <UserPlus size={14} />
                              <span>Asignar</span>
                            </button>
                            <button
                              onClick={() => openEditSectionModal(sec)}
                              style={styles.editBtn}
                              title="Editar"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteSection(sec.id, sec.code, sec.courseName)}
                              style={styles.deleteBtn}
                              title="Eliminar"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Admin Section Modal Dialog */}
      {showSectionModal && isAdmin && (
        <div style={styles.modalOverlay}>
          <div className="glass-card" style={styles.modalContent}>
            <div className="flex-between mb-20" style={styles.modalHeader}>
              <h3>{isEditing ? 'Editar Sección' : 'Registrar Nueva Sección'}</h3>
              <button onClick={() => setShowSectionModal(false)} style={styles.closeBtn}>✕</button>
            </div>

            <form onSubmit={handleSectionSubmit}>
              <div className="form-group">
                <label className="form-label">Asignatura del Catálogo *</label>
                <select
                  className="form-input form-select"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  required
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Código/Letra de Sección *</label>
                <input
                  type="text"
                  className="form-input"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="ej. A, NX51, B"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Periodo Académico *</label>
                <input
                  type="text"
                  className="form-input"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  placeholder="ej. 2026-I, 2026-II"
                  required
                />
              </div>

              <div style={styles.modalFooter}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowSectionModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {isEditing ? 'Guardar' : 'Crear Sección'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Teacher Assignment Modal Dialog */}
      {showTeacherModal && isAdmin && (
        <div style={styles.modalOverlay}>
          <div className="glass-card" style={styles.modalContent}>
            <div className="flex-between mb-20" style={styles.modalHeader}>
              <h3>Asignar Docente a Sección</h3>
              <button onClick={() => setShowTeacherModal(false)} style={styles.closeBtn}>✕</button>
            </div>

            <form onSubmit={handleTeacherAssignSubmit}>
              <div className="form-group">
                <label className="form-label">Seleccione el Docente *</label>
                <select
                  className="form-input form-select"
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  required
                >
                  <option value="">-- Seleccionar Docente --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.username} ({t.email})</option>
                  ))}
                </select>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTeacherModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-success">
                  Confirmar Asignación
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
  codeTag: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--border-light)',
    padding: '2px 8px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '0.85rem',
  },
  teacherSpan: {
    display: 'inline-flex',
    alignItems: 'center',
    color: 'hsl(220, 90%, 80%)',
    fontWeight: '500',
  },
  noTeacherSpan: {
    color: 'hsl(var(--text-muted))',
    fontStyle: 'italic',
  },
  periodTag: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '0.85rem',
    color: 'hsl(var(--text-muted))',
  },
  actionContainer: {
    display: 'inline-flex',
    gap: '8px',
  },
  actionBtn: {
    padding: '6px 12px',
    fontSize: '0.8rem',
  },
  editBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--border-light)',
    borderRadius: '6px',
    padding: '6px',
    cursor: 'pointer',
    color: '#fff',
    display: 'flex',
  },
  deleteBtn: {
    background: 'rgba(231, 76, 60, 0.1)',
    border: '1px solid rgba(231, 76, 60, 0.2)',
    borderRadius: '6px',
    padding: '6px',
    cursor: 'pointer',
    color: '#e74c3c',
    display: 'flex',
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
  actionContainerMobile: {
    display: 'flex',
    gap: '8px',
    width: '100%',
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
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '20px',
    borderTop: '1px solid var(--border-light)',
    paddingTop: '16px',
  }
};
