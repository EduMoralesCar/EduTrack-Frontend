import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Book, 
  FileText, 
  Upload, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  ArrowLeft,
  Eye,
  EyeOff,
  Trash2,
  Download,
  Save
} from 'lucide-react';

export default function CourseContent({ user, preSelectedSectionId = null, onBack = null }) {
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(preSelectedSectionId || '');
  const [materials, setMaterials] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [grades, setGrades] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [expandedWeeks, setExpandedWeeks] = useState({ 1: true }); // Open Week 1 by default
  const [submissionFiles, setSubmissionFiles] = useState({});
  const [submissionComments, setSubmissionComments] = useState({});
  const [showEvalForm, setShowEvalForm] = useState({}); // Toggles form for each week
  const [showMaterialForm, setShowMaterialForm] = useState({}); // Toggles materials form for each week
  const [showSubmissionForm, setShowSubmissionForm] = useState({}); // Toggles student homework submission form
  const [expandedTeacherGrading, setExpandedTeacherGrading] = useState({}); // Toggles grading list for each evaluation
  const [notification, setNotification] = useState({ message: '', type: '' }); // type: 'success' | 'danger'
  
  // States for inline preview
  const [previewFileUrl, setPreviewFileUrl] = useState(null);
  const [previewFileName, setPreviewFileName] = useState('');

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification({ message: '', type: '' });
    }, 4000);
  };

  const loadSections = async () => {
    try {
      const data = await api.sections.getAll();
      let userSections = data;
      if (user.role === 'TEACHER') {
         userSections = data.filter(s => s.teacherId === user.id || s.teacherUsername?.toLowerCase() === user.username.toLowerCase());
      } else if (user.role === 'STUDENT') {
         const myEnrs = await api.enrollments.getMyEnrollments();
         const enrolledIds = myEnrs.map(e => e.sectionId);
         userSections = data.filter(s => enrolledIds.includes(s.id));
      }
      
      const filtered = userSections.filter(s => s.period === '2026-I');
      setSections(filtered);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      await loadSections();
      if (preSelectedSectionId) {
        setSelectedSection(preSelectedSectionId);
        fetchCourseData(preSelectedSectionId);
      }
    };
    initialize();
  }, [preSelectedSectionId]);

  const handleSectionChange = async (e) => {
    const secId = e.target.value;
    setSelectedSection(secId);
    if (secId) {
      fetchCourseData(secId);
    } else {
      setMaterials([]);
      setAssignments([]);
    }
  };

  const fetchCourseData = async (secId) => {
    try {
      const mats = await api.materials.getBySection(secId);
      const asgs = await api.assignments.getBySection(secId);
      const sortedAsgs = asgs.sort((a, b) => {
        if (a.weekNumber !== b.weekNumber) return a.weekNumber - b.weekNumber;
        const categoryOrder = { 'PA': 1, 'PC1': 2, 'PC2': 3, 'PC3': 4, 'EXFINAL': 5 };
        const orderA = categoryOrder[a.category] || 99;
        const orderB = categoryOrder[b.category] || 99;
        if (orderA !== orderB) return orderA - orderB;
        return a.id - b.id;
      });
      setMaterials(mats);
      setAssignments(sortedAsgs);

      try {
        const subs = await api.assignments.getSubmissions(secId);
        const grds = await api.grades.getSectionGrades(secId);
        let enrs = [];
        if (user.role === 'STUDENT') {
          enrs = [{ studentId: user.id, studentUsername: user.username, sectionId: Number(secId) }];
        } else {
          enrs = await api.enrollments.getBySectionId(secId);
        }
        setSubmissions(subs || []);
        setGrades(grds || []);
        setEnrollments(enrs || []);
      } catch (subErr) {
        console.error("Error loading submissions, grades or enrollments: ", subErr);
      }
    } catch(err) {
      console.error(err);
    }
  };

  const toggleWeek = (weekNumber) => {
    setExpandedWeeks(prev => ({
      ...prev,
      [weekNumber]: !prev[weekNumber]
    }));
  };

  const handleUploadMaterial = async (e, weekNumber) => {
    e.preventDefault();
    const title = e.target.elements.title.value;
    const file = e.target.elements.file.files[0];
    if(!file) return;

    try {
      await api.materials.upload(selectedSection, weekNumber, title, file);
      showNotification('Material subido con éxito. Iniciará oculto para los alumnos.');
      e.target.reset();
      fetchCourseData(selectedSection);
    } catch(err) {
      showNotification('Error al subir material: ' + err.message, 'danger');
    }
  };

  const handleToggleMaterialVisibility = async (materialId) => {
    try {
      await api.materials.toggleVisibility(materialId);
      showNotification('Estado de visibilidad actualizado.');
      fetchCourseData(selectedSection);
    } catch (err) {
      showNotification('Error al cambiar visibilidad: ' + err.message, 'danger');
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este material?')) return;
    try {
      await api.materials.delete(materialId);
      showNotification('Material eliminado con éxito.');
      fetchCourseData(selectedSection);
    } catch (err) {
      showNotification('Error al eliminar material: ' + err.message, 'danger');
    }
  };

  const handleCreateAssignment = async (e, weekNumber) => {
    e.preventDefault();
    const name = e.target.elements.name.value;
    const type = e.target.elements.type.value;
    const category = e.target.elements.category.value;
    const startDateVal = e.target.elements.startDate.value;
    const endDateVal = e.target.elements.endDate.value;
    const description = e.target.elements.description?.value || '';
    const file = e.target.elements.file?.files?.[0];

    if (!name || !type || !category || !startDateVal || !endDateVal) {
      showNotification('Por favor complete todos los campos.', 'danger');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('type', type);
      formData.append('category', category);
      formData.append('weekNumber', weekNumber);
      formData.append('startDate', new Date(startDateVal).toISOString().slice(0, 19));
      formData.append('endDate', new Date(endDateVal).toISOString().slice(0, 19));
      formData.append('sectionId', selectedSection);
      if (description) {
        formData.append('description', description);
      }
      if (file) {
        formData.append('file', file);
      }

      await api.assignments.create(formData);
      showNotification('Evaluación programada con éxito.');
      e.target.reset();
      setShowEvalForm(prev => ({ ...prev, [weekNumber]: false }));
      fetchCourseData(selectedSection);
    } catch(err) {
      showNotification('Error al crear evaluación: ' + err.message, 'danger');
    }
  };

  const handleFileChange = (assignmentId, file) => {
    setSubmissionFiles(prev => ({
      ...prev,
      [assignmentId]: file
    }));
  };

  const handleCommentChange = (assignmentId, comment) => {
    setSubmissionComments(prev => ({
      ...prev,
      [assignmentId]: comment
    }));
  };

  const handleUploadSubmission = async (assignmentId) => {
    if (!user || !user.id) {
      showNotification('Error: Sesión incompleta (falta ID de usuario). Por favor, cierra sesión y vuelve a ingresar.', 'danger');
      return;
    }
    const file = submissionFiles[assignmentId];
    const comment = submissionComments[assignmentId] || '';
    if (!file) return showNotification('Por favor, selecciona un archivo primero.', 'danger');

    try {
      await api.assignments.submit(assignmentId, user.id, comment, file);
      showNotification('¡Entrega enviada con éxito!');
      setSubmissionFiles(prev => ({
        ...prev,
        [assignmentId]: null
      }));
      setSubmissionComments(prev => ({
        ...prev,
        [assignmentId]: ''
      }));
      const inputEl = document.getElementById(`file-input-${assignmentId}`);
      if (inputEl) inputEl.value = '';
      const commentEl = document.getElementById(`comment-input-${assignmentId}`);
      if (commentEl) commentEl.value = '';
      
      // Hide submission form on success
      setShowSubmissionForm(prev => ({
        ...prev,
        [assignmentId]: false
      }));

      // Refresh course content states to show submission changes immediately
      fetchCourseData(selectedSection);
    } catch (err) {
      showNotification('Error al enviar la entrega: ' + err.message, 'danger');
    }
  };
  const handleDirectGradeSubmit = async (e, assignmentId, studentId) => {
    e.preventDefault();
    const scoreVal = e.target.elements.score.value;
    const commentVal = e.target.elements.comment?.value || '';

    if (scoreVal === '') {
      showNotification('Por favor ingrese una nota válida (0-20).', 'danger');
      return;
    }

    try {
      await api.grades.record({
        assignmentId,
        studentId,
        score: parseFloat(scoreVal),
        teacherComment: commentVal
      });
      showNotification('Calificación registrada con éxito.');
      fetchCourseData(selectedSection);
    } catch (err) {
      showNotification('Error al registrar nota: ' + err.message, 'danger');
    }
  };

  const renderWeek = (weekNumber) => {
    const weekMaterials = materials.filter(m => m.weekNumber === weekNumber);
    const displayedMaterials = user.role === 'TEACHER' ? weekMaterials : weekMaterials.filter(m => m.visible);
    const weekAssignments = assignments.filter(a => a.weekNumber === weekNumber);
    const isExpanded = !!expandedWeeks[weekNumber];

    return (
      <div key={weekNumber} style={styles.weekCard}>
        {/* Accordion header */}
        <div 
          onClick={() => toggleWeek(weekNumber)} 
          style={styles.weekHeader}
          className="flex-between"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isExpanded ? (
              <ChevronDown size={20} style={{ color: 'hsl(var(--primary))' }} />
            ) : (
              <ChevronRight size={20} style={{ color: 'hsl(var(--text-muted))' }} />
            )}
            <span style={{ fontSize: '1.05rem', fontWeight: '600' }}>Semana {weekNumber}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span className="badge" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-light)', color: 'hsl(var(--text-secondary))' }}>
              {displayedMaterials.length} {displayedMaterials.length === 1 ? 'Material' : 'Materiales'}
            </span>
            <span className="badge" style={{ background: 'hsla(263, 90%, 51%, 0.1)', border: '1px solid hsla(263, 90%, 51%, 0.2)', color: 'hsl(263 100% 80%)' }}>
              {weekAssignments.length} {weekAssignments.length === 1 ? 'Evaluación' : 'Evaluaciones'}
            </span>
          </div>
        </div>

        {/* Accordion body */}
        {isExpanded && (
          <div style={styles.weekBody} className="fade-in">
            
            {/* Section Materials */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', marginBottom: '14px' }}>
                <h4 style={{ ...styles.sectionHeading, borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
                  <FileText size={16} />
                  <span>Materiales de la Semana</span>
                </h4>
                {user.role === 'TEACHER' && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMaterialForm(prev => ({ ...prev, [weekNumber]: !prev[weekNumber] }));
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    title="Subir nuevo material didáctico"
                  >
                    <Plus size={14} />
                    <span>Agregar</span>
                  </button>
                )}
              </div>
              {displayedMaterials.length === 0 ? (
                <p style={styles.emptyText}>No hay materiales didácticos cargados para esta semana.</p>
              ) : (
                <div style={styles.materialsList}>
                  {displayedMaterials.map(m => (
                    <div key={m.id} style={styles.materialItem} className="flex-between">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <a 
                          href={`http://localhost:8081/${m.filePath}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          style={{
                            ...styles.materialLink,
                            opacity: m.visible ? 1 : 0.6
                          }}
                        >
                          <FileText size={14} style={{ marginRight: '8px' }} />
                          {m.title}
                        </a>
                        {!m.visible && user.role === 'TEACHER' && (
                          <span className="badge" style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', color: 'hsl(var(--text-muted))', textTransform: 'none', border: '1px solid var(--border-light)' }}>Oculto para Alumnos</span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                        {/* Premium Inline Preview Button */}
                        <button
                          onClick={() => {
                            setPreviewFileUrl(`http://localhost:8081/${m.filePath}`);
                            setPreviewFileName(m.title);
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Vista previa del documento"
                        >
                          <Eye size={13} />
                          <span>Vista Previa</span>
                        </button>

                        <a 
                          href={`http://localhost:8081/${m.filePath}`} 
                          download
                          target="_blank" 
                          rel="noreferrer" 
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: 'inherit' }}
                          title="Descargar material"
                        >
                          <Download size={13} />
                          <span>Descargar</span>
                        </a>

                        {user.role === 'TEACHER' && (
                          <>
                            <button 
                              onClick={() => handleToggleMaterialVisibility(m.id)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 10px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center' }}
                              title={m.visible ? "Ocultar a estudiantes" : "Mostrar a estudiantes"}
                            >
                              {m.visible ? <EyeOff size={14} /> : <Eye size={14} style={{ color: 'hsl(var(--warning))' }} />}
                            </button>
                            <button 
                              onClick={() => handleDeleteMaterial(m.id)}
                              className="btn btn-danger"
                              style={{ padding: '6px 10px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center' }}
                              title="Eliminar material"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {user.role === 'TEACHER' && showMaterialForm[weekNumber] && (
                <form 
                  onSubmit={async (e) => {
                    await handleUploadMaterial(e, weekNumber);
                    setShowMaterialForm(prev => ({ ...prev, [weekNumber]: false }));
                  }} 
                  style={{ ...styles.uploadForm, position: 'relative', paddingRight: '45px' }}
                >
                  <button
                    type="button"
                    onClick={() => setShowMaterialForm(prev => ({ ...prev, [weekNumber]: false }))}
                    style={{ position: 'absolute', top: '12px', right: '12px', background: 'transparent', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold' }}
                    title="Cerrar"
                  >
                    ✕
                  </button>
                  <input 
                    type="text" 
                    name="title" 
                    placeholder="Título del material (ej. Diapositivas S3)" 
                    className="form-input" 
                    style={{ flex: 2 }} 
                    required 
                  />
                  <input 
                    type="file" 
                    name="file" 
                    className="form-input" 
                    style={{ flex: 2, padding: '8px 12px' }} 
                    required 
                  />
                  <button type="submit" className="btn btn-secondary" style={{ padding: '10px 16px' }}>
                    <Upload size={16} style={{ marginRight: '6px' }} />
                    Subir Material
                  </button>
                </form>
              )}
            </div>

            {/* Section Evaluations */}
            <div>
              <h4 style={styles.sectionHeading}>
                <CheckSquare size={16} />
                <span>Evaluaciones y Tareas</span>
              </h4>
              {weekAssignments.length === 0 ? (
                <p style={styles.emptyText}>No hay evaluaciones programadas para esta semana.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {weekAssignments.map(a => (
                    <div key={a.id} style={styles.evalItem}>
                      <div className="flex-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '10px', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <strong style={{ fontSize: '1.05rem', color: '#fff' }}>{a.name}</strong>
                          <span style={styles.categoryBadge}>{a.category} ({a.type})</span>
                          {user.role === 'STUDENT' && (() => {
                            const submission = submissions.find(s => s.assignmentId === a.id);
                            const studentGrades = grades.filter(g => g.assignmentId === a.id);
                            const grade = studentGrades.length > 0 ? studentGrades[studentGrades.length - 1] : null;
                            return (
                              <>
                                {submission ? (
                                  <span className="badge" style={{ background: 'hsla(142, 71%, 45%, 0.12)', border: '1px solid hsla(142, 71%, 45%, 0.25)', color: 'hsl(142 80% 80%)', marginLeft: '10px', textTransform: 'none' }}>
                                    Entregado
                                  </span>
                                ) : (
                                  <span className="badge" style={{ background: 'hsla(0, 84%, 60%, 0.12)', border: '1px solid hsla(0, 84%, 60%, 0.25)', color: 'hsl(0 90% 85%)', marginLeft: '10px', textTransform: 'none' }}>
                                    Pendiente
                                  </span>
                                )}
                                {grade && (
                                  <span className="badge" style={{ background: 'hsla(190, 90%, 50%, 0.12)', border: '1px solid hsla(190, 90%, 50%, 0.25)', color: 'hsl(190 100% 80%)', marginLeft: '10px', textTransform: 'none' }}>
                                    Calificado: {grade.score}
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                        <span style={styles.dateRange}>
                          Plazo: {new Date(a.startDate).toLocaleDateString()} al {new Date(a.endDate).toLocaleDateString()}
                        </span>
                      </div>

                      {a.description && (
                        <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', marginBottom: '14px', whiteSpace: 'pre-line', lineHeight: '1.4' }}>
                          {a.description}
                        </p>
                      )}

                      {a.instructionsFilePath && (
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', fontWeight: '500' }}>Indicaciones:</span>
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewFileUrl(`http://localhost:8081/${a.instructionsFilePath}`);
                              setPreviewFileName(`Indicaciones: ${a.name}`);
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title="Vista previa de indicaciones"
                          >
                            <Eye size={13} />
                            <span>Vista Previa</span>
                          </button>
                          <a
                            href={`http://localhost:8081/${a.instructionsFilePath}`}
                            download
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: 'inherit' }}
                            title="Descargar indicaciones"
                          >
                            <Download size={13} />
                            <span>Descargar</span>
                          </a>
                        </div>
                      )}

                      {/* File submit/status container for student */}
                      {user.role === 'STUDENT' && (() => {
                        const submission = submissions.find(s => s.assignmentId === a.id);
                        const studentGrades = grades.filter(g => g.assignmentId === a.id);
                        const grade = studentGrades.length > 0 ? studentGrades[studentGrades.length - 1] : null;
                        
                        if (submission) {
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {/* Student's Submission Details */}
                              <div style={{ ...styles.studentSubmitContainer, background: 'rgba(255,255,255,0.02)', padding: '14px', border: '1px solid var(--border-light)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                                <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: '600', display: 'block' }}>Mi Entrega:</span>
                                <div className="flex-between mt-10" style={{ flexWrap: 'wrap', gap: '8px' }}>
                                  <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
                                    Enviado el: {new Date(submission.submissionDate).toLocaleString()}
                                  </span>
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPreviewFileUrl(`http://localhost:8081/${submission.filePath}`);
                                        setPreviewFileName(`Mi Entrega: ${a.name}`);
                                      }}
                                      className="btn btn-secondary"
                                      style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    >
                                      <Eye size={12} />
                                      <span>Vista Previa</span>
                                    </button>
                                    <a
                                      href={`http://localhost:8081/${submission.filePath}`}
                                      download
                                      target="_blank"
                                      rel="noreferrer"
                                      className="btn btn-secondary"
                                      style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: 'inherit' }}
                                    >
                                      <Download size={12} />
                                      <span>Descargar</span>
                                    </a>
                                  </div>
                                </div>
                                {submission.studentComment && (
                                  <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '8px' }}>
                                    <strong>Mi comentario:</strong> "{submission.studentComment}"
                                  </p>
                                )}
                              </div>

                              {/* Teacher Feedback & Grade Details */}
                              {grade && (
                                <div style={{ background: 'hsla(142, 71%, 45%, 0.04)', border: '1px solid hsla(142, 71%, 45%, 0.15)', borderRadius: '8px', padding: '14px' }}>
                                  <span style={{ fontSize: '0.85rem', color: 'hsl(142 80% 80%)', display: 'block', fontWeight: '600' }}>Retroalimentación del Docente:</span>
                                  <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', display: 'block', marginTop: '6px' }}>
                                    Nota: {grade.score} / 20
                                  </span>
                                  {grade.teacherComment && (
                                    <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginTop: '8px', lineHeight: '1.4' }}>
                                      {grade.teacherComment}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        }

                        // Render upload form if not submitted yet
                        if (!showSubmissionForm[a.id]) {
                          return (
                            <div style={{ marginTop: '10px' }}>
                              <button 
                                className="btn btn-primary" 
                                onClick={() => setShowSubmissionForm(prev => ({ ...prev, [a.id]: true }))} 
                                style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                              >
                                <Upload size={14} />
                                <span>Realizar Entrega</span>
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div style={{ ...styles.studentSubmitContainer, flexDirection: 'column', alignItems: 'stretch', gap: '12px', display: 'flex', position: 'relative' }}>
                            <button
                              type="button"
                              onClick={() => setShowSubmissionForm(prev => ({ ...prev, [a.id]: false }))}
                              style={{ position: 'absolute', top: '10px', right: '12px', background: 'transparent', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
                              title="Cancelar"
                            >
                              ✕
                            </button>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '20px' }}>
                              <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', fontWeight: '500' }}>Comentario de entrega (opcional):</span>
                              <textarea 
                                id={`comment-input-${a.id}`}
                                placeholder="Escribe un mensaje o aclaración sobre tu entrega..."
                                onChange={e => handleCommentChange(a.id, e.target.value)} 
                                className="form-input"
                                style={{ fontSize: '0.85rem', padding: '8px 12px', width: '100%', minHeight: '60px', resize: 'vertical' }} 
                              />
                            </div>
                            <div className="flex-between" style={{ flexWrap: 'wrap', gap: '10px' }}>
                              <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>Sube tu archivo de entrega aquí:</span>
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <input 
                                  type="file" 
                                  id={`file-input-${a.id}`}
                                  onChange={e => handleFileChange(a.id, e.target.files[0])} 
                                  className="form-input"
                                  style={{ fontSize: '0.8rem', padding: '6px 12px', width: '220px' }} 
                                />
                                <button 
                                  className="btn btn-primary" 
                                  onClick={() => handleUploadSubmission(a.id)} 
                                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                                >
                                  <Upload size={14} style={{ marginRight: '6px' }} />
                                  Enviar Tarea
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Teacher direct grading flow */}
                      {user.role === 'TEACHER' && (() => {
                        const isGradingExpanded = !!expandedTeacherGrading[a.id];
                        return (
                          <div style={{ marginTop: '16px' }}>
                            <button
                              type="button"
                              onClick={() => setExpandedTeacherGrading(prev => ({ ...prev, [a.id]: !prev[a.id] }))}
                              className="btn btn-secondary"
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', padding: '8px 14px' }}
                            >
                              {isGradingExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              <span>Revisar Entregas y Calificar</span>
                              <span className="badge" style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', color: 'hsl(var(--text-secondary))', textTransform: 'none', border: '1px solid var(--border-light)' }}>
                                {enrollments.length} alumnos
                              </span>
                            </button>
                            
                            {isGradingExpanded && (
                              <div style={{ marginTop: '12px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '16px' }} className="fade-in">
                                <h5 style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', fontWeight: '600' }}>
                                  Alumnos Matriculados y Entregas
                                </h5>
                                {enrollments.length === 0 ? (
                                  <p style={styles.emptyText}>No hay alumnos matriculados en esta sección.</p>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    {enrollments.map(enr => {
                                      const sub = submissions.find(s => s.assignmentId === a.id && s.studentId === enr.studentId);
                                      const matchingGrades = grades.filter(g => g.assignmentId === a.id && g.studentId === enr.studentId);
                                      const grade = matchingGrades.length > 0 ? matchingGrades[matchingGrades.length - 1] : null;
                                      
                                      return (
                                        <div 
                                          key={enr.studentId} 
                                          style={{ 
                                            display: 'flex', 
                                            flexDirection: 'column', 
                                            gap: '8px', 
                                            padding: '12px', 
                                            background: 'rgba(5, 7, 12, 0.4)', 
                                            border: '1px solid var(--border-light)', 
                                            borderRadius: '8px' 
                                          }}
                                        >
                                          <div className="flex-between" style={{ flexWrap: 'wrap', gap: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                              <span style={{ fontWeight: '600', color: '#fff', fontSize: '0.9rem' }}>{enr.studentUsername}</span>
                                              {sub ? (
                                                <span className="badge" style={{ background: 'hsla(142, 71%, 45%, 0.12)', border: '1px solid hsla(142, 71%, 45%, 0.25)', color: 'hsl(142 80% 80%)', textTransform: 'none', fontSize: '0.7rem' }}>Entregado</span>
                                              ) : (
                                                <span className="badge" style={{ background: 'hsla(0, 84%, 60%, 0.12)', border: '1px solid hsla(0, 84%, 60%, 0.25)', color: 'hsl(0 90% 85%)', textTransform: 'none', fontSize: '0.7rem' }}>Pendiente</span>
                                              )}
                                            </div>
                                            
                                            {sub && (
                                              <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setPreviewFileUrl(`http://localhost:8081/${sub.filePath}`);
                                                    setPreviewFileName(`Entrega: ${enr.studentUsername} - ${a.name}`);
                                                  }}
                                                  className="btn btn-secondary"
                                                  style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                >
                                                  <Eye size={12} />
                                                  <span>Vista Previa</span>
                                                </button>
                                                <a
                                                  href={`http://localhost:8081/${sub.filePath}`}
                                                  download
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="btn btn-secondary"
                                                  style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: 'inherit' }}
                                                >
                                                  <Download size={12} />
                                                  <span>Descargar</span>
                                                </a>
                                              </div>
                                            )}
                                          </div>
                                          
                                          {sub && sub.studentComment && (
                                            <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)', margin: '4px 0' }}>
                                              <strong>Mensaje del alumno:</strong> "{sub.studentComment}"
                                            </p>
                                          )}
                                          
                                          {sub ? (
                                            <form 
                                              onSubmit={(e) => handleDirectGradeSubmit(e, a.id, enr.studentId)}
                                              style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}
                                            >
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>Nota:</span>
                                                <input 
                                                  name="score" 
                                                  type="number" 
                                                  step="0.1" 
                                                  min="0" 
                                                  max="20" 
                                                  defaultValue={grade ? grade.score : ''} 
                                                  placeholder="-" 
                                                  className="form-input" 
                                                  style={{ width: '60px', padding: '4px 8px', fontSize: '0.85rem', textAlign: 'center', height: '32px' }} 
                                                  required
                                                />
                                              </div>
                                              
                                              <input 
                                                name="comment" 
                                                type="text" 
                                                placeholder="Retroalimentación (comentario)..." 
                                                defaultValue={grade ? grade.teacherComment : ''} 
                                                className="form-input" 
                                                style={{ flexGrow: 1, padding: '4px 10px', fontSize: '0.85rem', height: '32px', minWidth: '150px' }} 
                                              />
                                              
                                              <button 
                                                type="submit" 
                                                className="btn btn-primary" 
                                                style={{ padding: '6px 14px', fontSize: '0.8rem', height: '32px' }}
                                              >
                                                <Save size={12} style={{ marginRight: '6px' }} />
                                                Guardar
                                              </button>
                                            </form>
                                          ) : (
                                            <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', fontStyle: 'italic', marginTop: '4px' }}>
                                              Requiere entrega del alumno para calificar.
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              )}

              {/* Collapsible form to create evaluation for Teacher */}
              {user.role === 'TEACHER' && (
                <div style={{ marginTop: '16px' }}>
                  {!showEvalForm[weekNumber] ? (
                    <button 
                      onClick={() => setShowEvalForm(prev => ({ ...prev, [weekNumber]: true }))}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                    >
                      <Plus size={14} style={{ marginRight: '6px' }} />
                      Programar Evaluación
                    </button>
                  ) : (
                    <div style={styles.evalFormContainer}>
                      <div className="flex-between mb-20">
                        <h5 style={{ color: '#fff', fontSize: '0.95rem' }}>Crear Nueva Evaluación (Semana {weekNumber})</h5>
                        <button 
                          type="button"
                          onClick={() => setShowEvalForm(prev => ({ ...prev, [weekNumber]: false }))} 
                          className="btn btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                        >
                          Cancelar
                        </button>
                      </div>
                      <form onSubmit={(e) => handleCreateAssignment(e, weekNumber)}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Nombre de Evaluación</label>
                            <input name="name" className="form-input" placeholder="ej. Práctica Calificada 1" required />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Tipo</label>
                            <select name="type" className="form-input" required>
                              <option value="TAREA">Tarea</option>
                              <option value="PRACTICA">Práctica Calificada</option>
                              <option value="EXAMEN">Examen Final</option>
                            </select>
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Categoría institucional</label>
                            <select name="category" className="form-input" required>
                              <option value="PA">PA (Tareas/Participación - 10%)</option>
                              <option value="PC1">PC1 (Práctica Calificada 1 - 20%)</option>
                              <option value="PC2">PC2 (Práctica Calificada 2 - 20%)</option>
                              <option value="PC3">PC3 (Práctica Calificada 3 - 20%)</option>
                              <option value="EXFINAL">EXFINAL (Examen Final - 30%)</option>
                            </select>
                          </div>
                          <div></div>
                          <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                            <label className="form-label">Descripción / Syllabus de Evaluación (Opcional)</label>
                            <textarea name="description" className="form-input" placeholder="Escriba aquí los temas a evaluar o indicaciones adicionales..." style={{ height: '70px', resize: 'vertical' }} />
                          </div>
                          <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                            <label className="form-label">Cargar Archivo de Indicaciones / Rúbrica (Opcional)</label>
                            <input type="file" name="file" className="form-input" style={{ padding: '8px 12px' }} />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Fecha de Inicio</label>
                            <input name="startDate" type="datetime-local" className="form-input" required />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Fecha de Cierre (Fin)</label>
                            <input name="endDate" type="datetime-local" className="form-input" required />
                          </div>
                        </div>
                        <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center' }}>
                          Guardar y Programar Evaluación
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    );
  };

  const activeSection = sections.find(s => String(s.id) === String(selectedSection));
  const sectionTitle = activeSection ? `${activeSection.courseName}` : 'Cargando asignatura...';
  const sectionCode = activeSection ? `${activeSection.code}` : '';

  return (
    <>
      {/* Toast Notification Banner (Positioned top-right to prevent header overlapping) */}
      {notification.message && (
        <div 
          className={`alert alert-${notification.type}`} 
          style={{ 
            position: 'fixed', 
            top: '30px', 
            right: '30px', 
            zIndex: 9999, 
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

      {/* Premium Inline File Preview Modal */}
      {previewFileUrl && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            background: 'rgba(5, 7, 12, 0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <div 
            className="glass-card" 
            style={{
              width: '100%',
              maxWidth: '1000px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-light)',
              borderRadius: '16px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              display: 'flex',
              flexDirection: 'column',
              height: '85vh',
              padding: '20px'
            }}
          >
            <div className="flex-between" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '15px', marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={24} style={{ color: 'hsl(var(--primary))' }} />
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.25rem' }}>{previewFileName}</h3>
              </div>
              <button 
                onClick={() => {
                  setPreviewFileUrl(null);
                  setPreviewFileName('');
                }}
                className="btn btn-secondary"
                style={{ padding: '6px 12px' }}
              >
                ✕ Cerrar Vista Previa
              </button>
            </div>
            <div style={{ flexGrow: 1, background: '#141a2a', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              {previewFileUrl && (previewFileUrl.toLowerCase().endsWith('.doc') || previewFileUrl.toLowerCase().endsWith('.docx')) ? (
                <div style={{ 
                  textAlign: 'center', 
                  maxWidth: '500px', 
                  padding: '40px', 
                  background: 'rgba(255, 255, 255, 0.03)', 
                  border: '1px solid var(--border-light)', 
                  borderRadius: '12px',
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
                }}>
                  <FileText size={64} style={{ color: 'hsl(var(--primary))', marginBottom: '20px' }} />
                  <h4 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '10px' }}>Documento de Word (.docx)</h4>
                  <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', marginBottom: '24px', lineHeight: '1.5' }}>
                    Los archivos de Word no se pueden previsualizar directamente en el navegador. Haz clic a continuación para descargar el documento y visualizarlo localmente.
                  </p>
                  <a 
                    href={previewFileUrl} 
                    download
                    className="btn btn-primary"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
                  >
                    <Download size={16} />
                    <span>Descargar Documento</span>
                  </a>
                </div>
              ) : (
                <iframe 
                  src={previewFileUrl} 
                  title="Material Preview" 
                  style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      <div className="glass-card fade-in" style={styles.cardContainer}>

      <div className="flex-between mb-20" style={styles.cardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Book size={28} style={{ color: 'hsl(var(--primary))' }} />
          <div>
            <h2 style={styles.mainTitle}>{sectionTitle}</h2>
            {sectionCode && <p style={styles.subtitle}>Sección: {sectionCode} | Ciclo Académico: 2026-I</p>}
          </div>
        </div>
        {onBack && (
          <button onClick={onBack} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} />
            <span>Volver a Mis Cursos</span>
          </button>
        )}
      </div>

      {!preSelectedSectionId && (
        <div style={styles.selectorContainer}>
          <label className="form-label"><CalendarIcon size={14} style={{ display: 'inline', marginRight: '5px' }} /> Seleccionar Curso / Sección (2026-I):</label>
          <select className="form-input form-select" value={selectedSection} onChange={handleSectionChange}>
            <option value="">-- Selecciona Curso --</option>
            {sections.map(s => (
              <option key={s.id} value={s.id}>{s.courseName} - {s.code}</option>
            ))}
          </select>
        </div>
      )}

      {selectedSection ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
          {Array.from({ length: 18 }).map((_, i) => renderWeek(i + 1))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', color: 'hsl(var(--text-muted))' }}>
          Selecciona un curso para ver su syllabus de 18 semanas.
        </div>
      )}
    </div>
  </>
  );
}

const styles = {
  cardContainer: {
    padding: '30px',
    borderRadius: '16px',
    border: '1px solid var(--border-light)',
    background: 'var(--glass-bg)',
    boxShadow: 'var(--glass-shadow)',
    textAlign: 'left',
    position: 'relative'
  },
  cardHeader: {
    borderBottom: '1px solid var(--border-light)',
    paddingBottom: '20px',
    marginBottom: '20px',
  },
  mainTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'hsl(var(--text-secondary))',
    marginTop: '4px',
  },
  selectorContainer: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-light)',
    padding: '16px',
    borderRadius: '12px',
    marginBottom: '20px',
  },
  weekCard: {
    border: '1px solid var(--border-light)',
    borderRadius: '12px',
    marginBottom: '12px',
    overflow: 'hidden',
    background: 'rgba(255, 255, 255, 0.01)',
    transition: 'all 0.2s ease',
  },
  weekHeader: {
    background: 'rgba(255, 255, 255, 0.02)',
    padding: '16px 20px',
    fontWeight: '600',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background 0.2s',
  },
  weekBody: {
    padding: '24px 20px',
    background: 'rgba(5, 7, 12, 0.3)',
    borderTop: '1px solid var(--border-light)',
  },
  sectionHeading: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.05rem',
    fontWeight: '600',
    color: 'hsl(var(--text-secondary))',
    marginBottom: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: '6px',
  },
  emptyText: {
    fontSize: '0.9rem',
    color: 'hsl(var(--text-muted))',
    fontStyle: 'italic',
    marginBottom: '10px',
  },
  materialsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px',
  },
  materialItem: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border-light)',
    borderRadius: '8px',
    padding: '10px 16px',
  },
  materialLink: {
    color: 'hsl(263 100% 80%)',
    display: 'flex',
    alignItems: 'center',
    fontWeight: '500',
    fontSize: '0.9rem',
  },
  uploadForm: {
    display: 'flex',
    gap: '12px',
    marginTop: '12px',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.01)',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    flexWrap: 'wrap',
  },
  evalItem: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-light)',
    borderRadius: '10px',
    padding: '16px',
  },
  categoryBadge: {
    background: 'hsla(263, 90%, 51%, 0.15)',
    color: 'hsl(263 100% 85%)',
    border: '1px solid hsla(263, 90%, 51%, 0.3)',
    fontSize: '0.75rem',
    padding: '2px 8px',
    borderRadius: '4px',
    fontWeight: '600',
    marginLeft: '10px',
    display: 'inline-block',
  },
  dateRange: {
    fontSize: '0.85rem',
    color: 'hsl(var(--text-muted))',
  },
  studentSubmitContainer: {
    background: 'rgba(5, 7, 12, 0.4)',
    border: '1px solid var(--border-light)',
    borderRadius: '8px',
    padding: '10px 14px',
    marginTop: '12px',
    gap: '16px',
    flexWrap: 'wrap',
  },
  evalFormContainer: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid hsla(263, 90%, 51%, 0.3)',
    borderRadius: '12px',
    padding: '20px',
    marginTop: '12px',
  },
  formCancelBtn: {
    background: 'transparent',
    border: 'none',
    color: 'hsl(var(--text-muted))',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '500',
  }
};
