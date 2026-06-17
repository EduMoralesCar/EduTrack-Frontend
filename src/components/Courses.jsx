import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BookOpen, Plus, Edit2, Trash2, ShieldAlert, CheckCircle, HelpCircle } from 'lucide-react';
import CourseContent from './CourseContent';

export default function Courses({ user }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form & Modal States (Only for Admin)
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [credits, setCredits] = useState(3);

  // States for course details inline view
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [courseToSectionMap, setCourseToSectionMap] = useState({});

  const isAdmin = user.role === 'ADMIN';

  const fetchCourses = async () => {
    setLoading(true);
    setError('');
    try {
      const allCourses = await api.courses.getAll();
      
      if (user.role === 'ADMIN') {
        setCourses(allCourses || []);
      } else if (user.role === 'TEACHER') {
        const allSections = await api.sections.getAll();
        const teacherSections = allSections.filter(sec => sec.teacherUsername === user.username && sec.period === '2026-I');
        const assignedCourseIds = [...new Set(teacherSections.map(sec => sec.courseId))];
        const teacherCourses = allCourses.filter(c => assignedCourseIds.includes(c.id));
        
        const mapping = {};
        teacherSections.forEach(sec => {
          mapping[sec.courseId] = sec.id;
        });
        setCourseToSectionMap(mapping);
        setCourses(teacherCourses);
      } else if (user.role === 'STUDENT') {
        const studentEnrollments = await api.enrollments.getMyEnrollments();
        const allSections = await api.sections.getAll();
        const enrolledSectionIds = studentEnrollments.map(enr => enr.sectionId);
        const studentSections = allSections.filter(sec => enrolledSectionIds.includes(sec.id) && sec.period === '2026-I');
        const enrolledCourseIds = [...new Set(studentSections.map(sec => sec.courseId))];
        const studentCourses = allCourses.filter(c => enrolledCourseIds.includes(c.id));
        
        const mapping = {};
        studentSections.forEach(sec => {
          mapping[sec.courseId] = sec.id;
        });
        setCourseToSectionMap(mapping);
        setCourses(studentCourses);
      }
    } catch (err) {
      setError(err.message || 'Error al obtener la lista de cursos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const openCreateModal = () => {
    if (!isAdmin) return;
    setIsEditing(false);
    setSelectedCourseId(null);
    setName('');
    setCode('');
    setDescription('');
    setCredits(3);
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const openEditModal = (targetCourse) => {
    if (!isAdmin) return;
    setIsEditing(true);
    setSelectedCourseId(targetCourse.id);
    setName(targetCourse.name);
    setCode(targetCourse.code);
    setDescription(targetCourse.description || '');
    setCredits(targetCourse.credits || 3);
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const handleDeleteCourse = async (id, courseName) => {
    if (!isAdmin) return;
    if (!window.confirm(`¿Está seguro que desea eliminar el curso "${courseName}"? Se perderán las secciones asociadas.`)) {
      return;
    }

    try {
      await api.courses.delete(id);
      setSuccess('Curso eliminado con éxito');
      fetchCourses();
    } catch (err) {
      setError(err.message || 'Error al eliminar el curso');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!name || !code || !credits) {
      setError('Por favor complete los campos requeridos');
      return;
    }

    setError('');
    setSuccess('');

    try {
      const courseData = { name, code, description, credits: parseInt(credits) };
      
      if (isEditing) {
        await api.courses.update(selectedCourseId, courseData);
        setSuccess('Curso actualizado con éxito');
      } else {
        await api.courses.create(courseData);
        setSuccess('Curso creado con éxito');
      }
      setShowModal(false);
      fetchCourses();
    } catch (err) {
      setError(err.message || 'Error al guardar el curso');
    }
  };

  if (selectedSectionId) {
    return (
      <CourseContent
        user={user}
        preSelectedSectionId={selectedSectionId}
        onBack={() => setSelectedSectionId(null)}
      />
    );
  }

  return (
    <div style={styles.container}>
      <div className="flex-between mb-20">
        <div>
          <h2 style={styles.pageTitle}>{isAdmin ? 'Gestión de Cursos' : 'Catálogo de Cursos'}</h2>
          <p style={styles.pageSubtitle}>Listado de materias dictadas en la plataforma académica</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={18} />
            <span>Nuevo Curso</span>
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
          <span style={{ marginLeft: '12px' }}>Cargando catálogo de asignaturas...</span>
        </div>
      ) : (
        <div style={styles.gridContainer}>
          {courses.length === 0 ? (
            <div className="glass-card text-center" style={styles.emptyCard}>
              <BookOpen size={48} style={{ color: 'hsl(var(--text-muted))', marginBottom: '12px' }} />
              <h3>Sin cursos registrados</h3>
              <p>
                {user.role === 'STUDENT'
                  ? 'No se encuentra matriculado en ningún curso activo.'
                  : user.role === 'TEACHER'
                    ? 'No tiene asignaturas asignadas en este periodo.'
                    : 'No se encontraron asignaturas activas en este período.'}
              </p>
            </div>
          ) : (
            courses.map((course) => (
              <div 
                key={course.id} 
                className="glass-card" 
                style={{
                  ...styles.courseCard,
                  cursor: !isAdmin ? 'pointer' : 'default',
                  transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease',
                }}
                onClick={() => {
                  if (!isAdmin) {
                    const sectionId = courseToSectionMap[course.id];
                    if (sectionId) {
                      setSelectedSectionId(sectionId);
                    } else {
                      setError('No se encontró una sección activa para este curso en el periodo actual.');
                    }
                  }
                }}
                onMouseEnter={(e) => {
                  if (!isAdmin) {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 30px rgba(111, 44, 246, 0.15)';
                    e.currentTarget.style.borderColor = 'hsla(263, 90%, 51%, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isAdmin) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = 'var(--border-light)';
                  }
                }}
              >
                <div className="flex-between mb-20">
                  <div style={styles.codeBadge}>{course.code}</div>
                  <div style={styles.creditsLabel}>{course.credits} Créditos</div>
                </div>
                
                <h3 style={styles.courseName}>{course.name}</h3>
                <p style={styles.courseDesc}>
                  {course.description || 'Sin descripción detallada disponible para esta asignatura académica.'}
                </p>

                {isAdmin && (
                  <div style={styles.courseFooter} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openEditModal(course)}
                      className="btn btn-secondary"
                      style={styles.editBtn}
                    >
                      <Edit2 size={14} />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleDeleteCourse(course.id, course.name)}
                      className="btn btn-danger"
                      style={styles.deleteBtn}
                    >
                      <Trash2 size={14} />
                      <span>Eliminar</span>
                    </button>
                  </div>
                )}

                {!isAdmin && (
                  <div style={styles.courseFooter}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const sectionId = courseToSectionMap[course.id];
                        if (sectionId) {
                          setSelectedSectionId(sectionId);
                        } else {
                          setError('No se encontró una sección activa para este curso en el periodo actual.');
                        }
                      }}
                      className="btn btn-primary"
                      style={{ width: '100%', justifyContent: 'center', gap: '8px' }}
                    >
                      <BookOpen size={16} />
                      <span>Ver Contenido</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Admin Modal Dialog */}
      {showModal && isAdmin && (
        <div style={styles.modalOverlay}>
          <div className="glass-card" style={styles.modalContent}>
            <div className="flex-between mb-20" style={styles.modalHeader}>
              <h3>{isEditing ? 'Editar Curso' : 'Registrar Nuevo Curso'}</h3>
              <button onClick={() => setShowModal(false)} style={styles.closeBtn}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Código del Curso *</label>
                <input
                  type="text"
                  className="form-input"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="ej. INF-401"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nombre del Curso *</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ej. Introducción a la Programación"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Créditos Académicos *</label>
                <input
                  type="number"
                  className="form-input"
                  value={credits}
                  onChange={(e) => setCredits(e.target.value)}
                  min="1"
                  max="10"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea
                  className="form-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalles sobre el silabo del curso..."
                  rows="3"
                  style={{ resize: 'none', fontFamily: 'inherit' }}
                />
              </div>

              <div style={styles.modalFooter}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {isEditing ? 'Guardar Cambios' : 'Crear Curso'}
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
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '24px',
  },
  courseCard: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
    padding: '24px',
  },
  codeBadge: {
    background: 'hsla(263, 90%, 51%, 0.15)',
    color: 'hsl(263 100% 80%)',
    border: '1px solid hsla(263, 90%, 51%, 0.25)',
    padding: '4px 10px',
    borderRadius: '6px',
    fontFamily: 'var(--font-heading)',
    fontWeight: '600',
    fontSize: '0.85rem',
  },
  creditsLabel: {
    fontSize: '0.85rem',
    color: 'hsl(var(--text-muted))',
    fontWeight: '500',
  },
  courseName: {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '10px',
    color: '#fff',
  },
  courseDesc: {
    fontSize: '0.9rem',
    color: 'hsl(var(--text-secondary))',
    lineHeight: '1.5',
    flexGrow: 1,
    marginBottom: '20px',
  },
  courseFooter: {
    display: 'flex',
    gap: '12px',
    marginTop: 'auto',
    borderTop: '1px solid var(--border-light)',
    paddingTop: '16px',
  },
  editBtn: {
    flexGrow: 1,
    padding: '8px 12px',
    fontSize: '0.85rem',
  },
  deleteBtn: {
    flexGrow: 1,
    padding: '8px 12px',
    fontSize: '0.85rem',
  },
  emptyCard: {
    gridColumn: '1 / -1',
    padding: '60px 20px',
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
    width: '100%',
    maxWidth: '480px',
    border: '1px solid rgba(255,255,255,0.12)',
    animation: 'slideIn 0.3s ease',
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
    fontSize: '1.2rem',
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
