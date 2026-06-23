import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Award, BookOpen, Calendar, Save, Eye, FileText, User, Filter, TrendingUp, CheckCircle, Download } from 'lucide-react';

export default function Grades({ user }) {
  const [sections, setSections] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [availableSections, setAvailableSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState('');
  
  const [assignments, setAssignments] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [finalGrades, setFinalGrades] = useState([]);
  const [individualGrades, setIndividualGrades] = useState([]);
  const [submissions, setSubmissions] = useState([]); // Student uploaded files

  // Filters and alerts
  const [selectedStudentFilter, setSelectedStudentFilter] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(''); // PA, PC, EXFINAL
  const [notification, setNotification] = useState({ message: '', type: '' });

  // Preview modal states
  const [previewFileUrl, setPreviewFileUrl] = useState(null);
  const [previewFileName, setPreviewFileName] = useState('');

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

  const filterSectionsByPeriod = (allSections, period) => {
    let filtered = allSections.filter(s => s.period === period);
    setAvailableSections(filtered);
    setSelectedSection('');
    setAssignments([]);
    setEnrollments([]);
    setFinalGrades([]);
    setIndividualGrades([]);
    setSubmissions([]);
    setSelectedStudentFilter('');
    setSelectedCategoryFilter('');
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
    setSelectedCategoryFilter('');
    if (sectionId) {
      try {
        const asgs = await api.assignments.getBySection(sectionId);
        const sortedAsgs = asgs.sort((a, b) => {
          if (a.weekNumber !== b.weekNumber) return a.weekNumber - b.weekNumber;
          const categoryOrder = { 'PA': 1, 'PC1': 2, 'PC2': 3, 'PC3': 4, 'EXFINAL': 5 };
          const orderA = categoryOrder[a.category] || 99;
          const orderB = categoryOrder[b.category] || 99;
          if (orderA !== orderB) return orderA - orderB;
          return a.id - b.id;
        });
        setAssignments(sortedAsgs);
        
        if (user.role === 'STUDENT') {
          const myEnrs = [{ studentId: user.id, studentUsername: user.username, sectionId: Number(sectionId) }];
          setEnrollments(myEnrs);
          setSelectedStudentFilter(String(user.id));
        } else {
          try {
            const enrs = await api.enrollments.getBySectionId(sectionId);
            setEnrollments(enrs);
          } catch (enrErr) {
            console.error("Enrollments load error", enrErr);
            setEnrollments([]);
          }
          // Fetch submissions for teacher/admin to grade
          try {
            const subs = await api.assignments.getSubmissions(sectionId);
            setSubmissions(subs || []);
          } catch (err) {
            console.error("Submissions load error", err);
            setSubmissions([]);
          }
        }
        
        const finals = await api.grades.getFinalGrades(sectionId);
        setFinalGrades(user.role === 'STUDENT' ? finals.filter(fg => Number(fg.studentId) === Number(user.id) || fg.studentUsername.toLowerCase() === user.username.toLowerCase()) : finals);
        
        const inds = await api.grades.getSectionGrades(sectionId);
        setIndividualGrades(inds);
      } catch (err) {
        console.error(err);
      }
    } else {
      setAssignments([]);
      setEnrollments([]);
      setFinalGrades([]);
      setIndividualGrades([]);
      setSubmissions([]);
    }
  };

  const handleGradeSubmit = async (e, assignmentId, studentId) => {
    e.preventDefault();
    const score = e.target.elements.score.value;
    try {
      await api.grades.record({
        assignmentId,
        studentId,
        score: parseFloat(score),
        teacherComment: 'Registrado desde UI de Calificaciones'
      });
      showNotification('Calificación registrada correctamente.');
      const finals = await api.grades.getFinalGrades(selectedSection);
      setFinalGrades(user.role === 'STUDENT' ? finals.filter(fg => fg.studentUsername === user.username) : finals);
      const inds = await api.grades.getSectionGrades(selectedSection);
      setIndividualGrades(inds);
    } catch (err) {
      showNotification('Error al registrar nota: ' + err.message, 'danger');
    }
  };

  const getGradeValue = (studentId, assignmentId) => {
    const matching = individualGrades.filter(g => g.studentId === studentId && g.assignmentId === assignmentId);
    return matching.length > 0 ? matching[matching.length - 1].score : '';
  };

  const handleStudentFilterChange = (e) => {
    setSelectedStudentFilter(e.target.value);
  };

  const handleCategoryFilterChange = (e) => {
    setSelectedCategoryFilter(e.target.value);
  };

  // Filter assignments based on category selected
  const displayedAssignments = assignments.filter(a => {
    if (!selectedCategoryFilter) return true;
    if (selectedCategoryFilter === 'PC') return a.category.startsWith('PC');
    return a.category === selectedCategoryFilter;
  });

  const displayedEnrollments = selectedStudentFilter && user.role !== 'STUDENT'
    ? enrollments.filter(e => String(e.studentId) === String(selectedStudentFilter))
    : enrollments;

  const displayedFinalGrades = selectedStudentFilter && user.role !== 'STUDENT'
    ? finalGrades.filter(fg => String(fg.studentId) === String(selectedStudentFilter))
    : finalGrades;

  const render18WeeksGrid = (studentId) => {
    const targetEnr = enrollments.find(e => String(e.studentId) === String(studentId));
    const studentName = targetEnr ? targetEnr.studentUsername : user.username;
    
    // Filter assignments shown in the timeline grid based on category filter
    const gridAssignments = assignments.filter(a => {
      if (!selectedCategoryFilter) return true;
      if (selectedCategoryFilter === 'PC') return a.category.startsWith('PC');
      return a.category === selectedCategoryFilter;
    });

    // Compute average for selected filter
    let sumFiltered = 0;
    let countFiltered = 0;
    let categoryTitle = "Promedio General";
    
    if (selectedCategoryFilter === 'PA') {
      categoryTitle = "Promedio de Tareas Continuas (PA - 10%)";
    } else if (selectedCategoryFilter === 'PC') {
      categoryTitle = "Promedio de Prácticas Calificadas (PCs - 60%)";
    } else if (selectedCategoryFilter === 'EXFINAL') {
      categoryTitle = "Nota de Examen Final (EXFINAL - 30%)";
    } else {
      categoryTitle = "Promedio Consolidado del Semestre";
    }

    gridAssignments.forEach(a => {
      const val = getGradeValue(studentId, a.id);
      if (val !== null && val !== undefined && val !== '') {
        sumFiltered += parseFloat(val);
        countFiltered++;
      }
    });

    const calculatedAvg = countFiltered > 0 ? (sumFiltered / countFiltered).toFixed(1) : '-';
    
    let displayAverage = calculatedAvg;
    if (!selectedCategoryFilter) {
      const studentFinal = finalGrades.find(fg => String(fg.studentId) === String(studentId));
      displayAverage = studentFinal && studentFinal.finalAverage !== null && studentFinal.finalAverage !== undefined
        ? studentFinal.finalAverage.toFixed(1)
        : calculatedAvg;
    }

    return (
      <div className="glass-card mt-20" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', padding: '24px', position: 'relative' }}>
        <div className="flex-between mb-20" style={{ flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h4 style={{ fontFamily: 'var(--font-heading)', color: '#fff', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={20} style={{ color: 'hsl(var(--primary))' }} />
              <span>Cronograma de 18 Semanas: {studentName}</span>
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginTop: '2px' }}>
              Control de avance, entregas y registro de notas semana a semana.
            </p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', padding: '10px 18px', borderRadius: '10px', textAlign: 'right' }}>
            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', display: 'block', fontWeight: '500' }}>
              {categoryTitle}
            </span>
            <span style={{ 
              fontSize: '1.6rem', 
              fontWeight: '800', 
              color: displayAverage !== '-' ? (parseFloat(displayAverage) >= 12.5 ? 'hsl(var(--success))' : 'hsl(var(--danger))') : 'hsl(var(--text-muted))'
            }}>
              {displayAverage}
            </span>
          </div>
        </div>

        {/* 18 Weeks Grid Redesign */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
          {Array.from({ length: 18 }).map((_, i) => {
            const weekNum = i + 1;
            const weekAsgs = gridAssignments.filter(a => a.weekNumber === weekNum);

            return (
              <div 
                key={weekNum} 
                style={{ 
                  background: 'rgba(13, 17, 28, 0.4)', 
                  border: '1px solid var(--border-light)', 
                  borderRadius: '12px', 
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '120px',
                  transition: 'border-color 0.2s',
                }}
                className="hover-card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '6px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'hsl(var(--text-muted))' }}>S{weekNum}</span>
                  {weekAsgs.length > 0 && (
                    <span className="badge" style={{ fontSize: '0.6rem', padding: '1px 6px', background: 'hsla(263, 90%, 51%, 0.1)', border: '1px solid hsla(263, 90%, 51%, 0.2)', color: 'hsl(263 100% 85%)', textTransform: 'none' }}>
                      {weekAsgs[0].category}
                    </span>
                  )}
                </div>

                {weekAsgs.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1, justifyContent: 'center' }}>
                    {weekAsgs.map(a => {
                      const score = getGradeValue(studentId, a.id);
                      const sub = submissions.find(s => s.assignmentId === a.id && s.studentId === studentId);
                      
                      return (
                        <div key={a.id} style={{ textAlign: 'center' }}>
                          <div 
                            style={{ fontSize: '0.75rem', color: '#fff', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '6px' }} 
                            title={a.name}
                          >
                            {a.name}
                          </div>
                          
                          {a.instructionsFilePath && (
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginBottom: '8px' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewFileUrl(api.getFileUrl(a.instructionsFilePath));
                                  setPreviewFileName(`Indicaciones: ${a.name}`);
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '2px 4px', fontSize: '0.65rem', height: '18px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                                title="Ver indicaciones"
                              >
                                <Eye size={8} /> Inst.
                              </button>
                              <a
                                href={api.getFileUrl(a.instructionsFilePath)}
                                download
                                target="_blank; noreferrer"
                                className="btn btn-secondary"
                                style={{ padding: '2px 4px', height: '18px', display: 'inline-flex', alignItems: 'center', color: 'inherit' }}
                                title="Descargar indicaciones"
                              >
                                <Download size={8} />
                              </a>
                            </div>
                          )}
                          
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center' }}>
                            {user.role === 'TEACHER' ? (
                              <form 
                                onSubmit={(e) => handleGradeSubmit(e, a.id, studentId)} 
                                style={{ display: 'flex', gap: '4px', width: '100%', justifyContent: 'center' }}
                              >
                                <input 
                                  name="score" 
                                  type="number" 
                                  step="0.1" 
                                  min="0" 
                                  max="20" 
                                  defaultValue={score} 
                                  placeholder="-" 
                                  className="form-input" 
                                  style={{ width: '50px', padding: '4px', fontSize: '0.8rem', textAlign: 'center', height: '28px' }} 
                                  required
                                />
                                <button 
                                  type="submit" 
                                  className="btn btn-secondary" 
                                  style={{ padding: '4px', display: 'flex', alignItems: 'center', height: '28px' }} 
                                  title="Guardar"
                                >
                                  <Save size={10}/>
                                </button>
                              </form>
                            ) : (
                              <div style={{ 
                                fontSize: '1.2rem', 
                                fontWeight: '700', 
                                color: score !== '' ? (parseFloat(score) >= 12.5 ? 'hsl(var(--success))' : 'hsl(var(--danger))') : 'hsl(var(--text-muted))' 
                              }}>
                                {score !== '' ? score : '--'}
                              </div>
                            )}

                            {/* Preview homework submission */}
                            {sub && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px', alignItems: 'center', width: '100%' }}>
                                {sub.studentComment && (
                                  <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-secondary))', fontStyle: 'italic', background: 'rgba(255,255,255,0.03)', padding: '4px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', width: '100%', wordBreak: 'break-word', textAlign: 'left' }}>
                                    <strong>Msg:</strong> {sub.studentComment}
                                  </div>
                                )}
                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', width: '100%' }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPreviewFileUrl(api.getFileUrl(sub.filePath));
                                      setPreviewFileName(`Entrega: ${studentName} - ${a.name}`);
                                    }}
                                    className="btn btn-secondary"
                                    style={{ padding: '4px', height: '28px', width: '28px', background: 'hsla(263, 90%, 51%, 0.1)', border: '1px solid hsla(263, 90%, 51%, 0.2)', color: 'hsl(263 100% 85%)' }}
                                    title="Ver entrega del alumno"
                                  >
                                    <Eye size={12} />
                                  </button>
                                  <a
                                    href={api.getFileUrl(sub.filePath)}
                                    download
                                    target="_blank; noreferrer"
                                    className="btn btn-secondary"
                                    style={{ padding: '4px', height: '28px', width: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: 'inherit' }}
                                    title="Descargar entrega del alumno"
                                  >
                                    <Download size={12} />
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexGrow: 1, color: 'rgba(255,255,255,0.03)', fontSize: '1rem', fontWeight: '700' }}>-</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const studentDetailId = user.role === 'STUDENT' ? selectedStudentFilter : (selectedStudentFilter !== '' ? selectedStudentFilter : null);

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

      {/* Premium File Preview Modal */}
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
                  title="Homework Preview" 
                  style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      <div className="glass-card fade-in" style={{ padding: '30px', border: '1px solid var(--border-light)', borderRadius: '16px' }}>

      {/* Header section */}
      <div className="flex-between mb-20" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Award size={28} style={{ color: 'hsl(var(--primary))' }} />
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: '700', color: '#fff', margin: 0 }}>
              Calificaciones Académicas
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', marginTop: '2px' }}>
              Planilla de notas consolidadas y seguimiento del avance curricular.
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

        {selectedSection && (
          <>
            {user.role === 'TEACHER' && (
              <div>
                <label className="form-label"><User size={13} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} /> Alumno:</label>
                <select className="form-input form-select" value={selectedStudentFilter} onChange={handleStudentFilterChange} style={{ marginTop: '6px' }}>
                  <option value="">-- Todos los Alumnos --</option>
                  {enrollments.map(enr => (
                    <option key={enr.studentId} value={enr.studentId}>{enr.studentUsername}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="form-label"><Filter size={13} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} /> Tipo Evaluación:</label>
              <select className="form-input form-select" value={selectedCategoryFilter} onChange={handleCategoryFilterChange} style={{ marginTop: '6px' }}>
                <option value="">-- Todas las Categorías --</option>
                <option value="PA">PA (Tareas Continuas - 10%)</option>
                <option value="PC">PC (Prácticas Calificadas - 60%)</option>
                <option value="EXFINAL">EXFINAL (Examen Final - 30%)</option>
              </select>
            </div>
          </>
        )}
      </div>

      {selectedSection && (
        <div className="fade-in">
          {/* Main Table: General Grades list */}
          {user.role !== 'STUDENT' && (
            <div style={{ marginBottom: '35px' }}>
              <h4 style={{ fontFamily: 'var(--font-heading)', color: '#fff', fontSize: '1.25rem', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={18} style={{ color: 'hsl(var(--primary))' }} />
                <span>Registro de Notas por Evaluación</span>
              </h4>
              
              {displayedAssignments.length === 0 ? (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '10px', textAlign: 'center', color: 'hsl(var(--text-muted))', border: '1px solid var(--border-light)' }}>
                  No hay evaluaciones registradas bajo el tipo seleccionado.
                </div>
              ) : (
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Estudiante</th>
                        {displayedAssignments.map(a => (
                          <th key={a.id} style={{ textAlign: 'center' }}>
                            <span style={{ display: 'block', fontSize: '0.85rem' }}>{a.name}</span>
                            <span className="badge" style={{ fontSize: '0.6rem', padding: '1px 6px', background: 'rgba(255,255,255,0.05)', color: 'hsl(var(--text-secondary))', textTransform: 'none', marginTop: '4px' }}>{a.category}</span>
                            {a.instructionsFilePath && (
                              <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPreviewFileUrl(api.getFileUrl(a.instructionsFilePath));
                                    setPreviewFileName(`Indicaciones: ${a.name}`);
                                  }}
                                  className="btn btn-secondary"
                                  style={{ padding: '2px 6px', fontSize: '0.65rem', height: '20px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                                  title="Ver indicaciones"
                                >
                                  <Eye size={10} /> Inst.
                                </button>
                                <a
                                  href={api.getFileUrl(a.instructionsFilePath)}
                                  download
                                  target="_blank; noreferrer"
                                  className="btn btn-secondary"
                                  style={{ padding: '2px 4px', height: '20px', width: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'inherit' }}
                                  title="Descargar indicaciones"
                                >
                                  <Download size={10} />
                                </a>
                              </div>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayedEnrollments.map(enr => (
                        <tr key={enr.id}>
                          <td style={{ fontWeight: '500' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <User size={14} className="text-muted" />
                              <span>{enr.studentUsername}</span>
                            </div>
                          </td>
                          {displayedAssignments.map(a => {
                            const score = getGradeValue(enr.studentId, a.id);
                            
                            return (
                              <td key={a.id} style={{ verticalAlign: 'middle' }}>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>
                                  <form onSubmit={(e) => handleGradeSubmit(e, a.id, enr.studentId)} style={{ display: 'flex', gap: '4px' }}>
                                    <input 
                                      name="score" 
                                      type="number" 
                                      step="0.1" 
                                      min="0" 
                                      max="20" 
                                      defaultValue={score} 
                                      placeholder="-" 
                                      className="form-input" 
                                      style={{ width: '50px', padding: '4px', fontSize: '0.85rem', textAlign: 'center', height: '32px' }} 
                                      required
                                    />
                                    <button 
                                      type="submit" 
                                      className="btn btn-secondary" 
                                      style={{ padding: '6px', display: 'flex', alignItems: 'center', height: '32px' }} 
                                      title="Guardar Nota"
                                    >
                                      <Save size={12}/>
                                    </button>
                                  </form>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Detailed 18 weeks Grid (For specific student or student view) */}
          {studentDetailId && render18WeeksGrid(parseInt(studentDetailId))}

          {/* Consolidado Final (UTP Acta) */}
          <div style={{ marginTop: '40px' }}>
            <h4 style={{ fontFamily: 'var(--font-heading)', color: '#fff', fontSize: '1.25rem', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} style={{ color: 'hsl(var(--primary))' }} />
              <span>Consolidado Final de Notas (Acta Oficial UTP)</span>
            </h4>
            {displayedFinalGrades.length === 0 ? (
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '10px', textAlign: 'center', color: 'hsl(var(--text-muted))', border: '1px solid var(--border-light)' }}>
                No hay registros finales consolidados disponibles.
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table" style={{ background: 'rgba(255, 255, 255, 0.01)' }}>
                  <thead>
                    <tr>
                      <th>Estudiante</th>
                      <th style={{ textAlign: 'center' }}>PC1 (20%)</th>
                      <th style={{ textAlign: 'center' }}>PC2 (20%)</th>
                      <th style={{ textAlign: 'center' }}>PC3 (20%)</th>
                      <th style={{ textAlign: 'center' }}>PA (10%)</th>
                      <th style={{ textAlign: 'center' }}>EXFINAL (30%)</th>
                      <th style={{ textAlign: 'center', color: 'hsl(var(--primary))' }}>PROMEDIO FINAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedFinalGrades.map(fg => (
                      <tr key={fg.studentId}>
                        <td style={{ fontWeight: '500' }}>{fg.studentUsername}</td>
                        <td style={{ textAlign: 'center' }}>{fg.pc1 !== null && fg.pc1 !== undefined ? fg.pc1 : '-'}</td>
                        <td style={{ textAlign: 'center' }}>{fg.pc2 !== null && fg.pc2 !== undefined ? fg.pc2 : '-'}</td>
                        <td style={{ textAlign: 'center' }}>{fg.pc3 !== null && fg.pc3 !== undefined ? fg.pc3 : '-'}</td>
                        <td style={{ textAlign: 'center' }}>{fg.pa !== null && fg.pa !== undefined ? fg.pa.toFixed(1) : '-'}</td>
                        <td style={{ textAlign: 'center' }}>{fg.exfinal !== null && fg.exfinal !== undefined ? fg.exfinal : '-'}</td>
                        <td style={{ 
                          textAlign: 'center',
                          fontWeight: 'bold', 
                          color: fg.finalAverage >= 12.5 ? 'hsl(var(--success))' : 'hsl(var(--danger))'
                        }}>
                          {fg.finalAverage || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  </>
  );
}
