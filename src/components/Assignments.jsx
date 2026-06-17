import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { FileText, Plus, Upload, BookOpen, Calendar, Edit2 } from 'lucide-react';

export default function Assignments({ user }) {
  const [sections, setSections] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [availableSections, setAvailableSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState('');
  
  const [assignments, setAssignments] = useState([]);
  
  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('TAREA');
  const [dueDate, setDueDate] = useState('');
  const [weight, setWeight] = useState('');
  const [file, setFile] = useState(null);

  useEffect(() => {
    loadSections();
  }, []);

  const loadSections = async () => {
    try {
      // In a real app, you might only load sections for the current user's role
      // For now we get all and filter locally based on user if needed (the backend might already filter)
      const data = await api.sections.getAll();
      let filteredData = data;
      if (user.role === 'TEACHER') {
        filteredData = data.filter(s => s.teacher?.username === user.username || s.teacher?.id === user.id);
      } else if (user.role === 'STUDENT') {
        const myEnrs = await api.enrollments.getMyEnrollments();
        const enrolledIds = myEnrs.map(e => e.sectionId);
        filteredData = data.filter(s => enrolledIds.includes(s.id));
      }
      setSections(filteredData);
      
      // Extract unique periods from filtered
      const uniquePeriods = [...new Set(filteredData.map(s => s.period))].sort().reverse();
      setPeriods(uniquePeriods);
      
      // Select default period (prefer 2026-I, else latest)
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
  };

  const handlePeriodChange = (e) => {
    const period = e.target.value;
    setSelectedPeriod(period);
    filterSectionsByPeriod(sections, period);
  };

  const handleSectionChange = (e) => {
    const sectionId = e.target.value;
    setSelectedSection(sectionId);
    if (sectionId) {
      loadAssignments(sectionId);
    } else {
      setAssignments([]);
    }
  };

  const loadAssignments = async (sectionId) => {
    try {
      const data = await api.assignments.getBySection(sectionId);
      setAssignments(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      type: formData.get('type'),
      category: formData.get('category'),
      weekNumber: parseInt(formData.get('weekNumber')),
      startDate: new Date(formData.get('startDate')).toISOString().slice(0, 19),
      endDate: new Date(formData.get('endDate')).toISOString().slice(0, 19),
      sectionId: selectedSection
    };

    try {
      await api.assignments.create(data);
      alert('Evaluación creada exitosamente!');
      e.target.reset();
      
      const asgs = await api.assignments.getBySection(selectedSection);
      setAssignments(asgs);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleFileUpload = async (assignmentId) => {
    if (!file) return alert('Selecciona un archivo primero');
    try {
      await api.assignments.submit(assignmentId, user.id, file);
      alert('Entrega enviada con éxito!');
      setFile(null);
    } catch (err) {
      alert('Error al enviar: ' + err.message);
    }
  };

  return (
    <div className="card fade-in">
      <div className="card-header">
        <h2 className="card-title">
          <FileText size={24} style={{ color: 'var(--primary-color)' }} />
          Evaluaciones y Tareas
        </h2>
      </div>
      <div className="card-body">
        
        {/* Filtros de Semestre y Curso */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', background: 'var(--bg-secondary)', padding: '15px', borderRadius: '8px' }}>
          <div style={{ flex: 1 }}>
            <label className="form-label"><Calendar size={14} style={{display:'inline', marginRight:'5px'}}/> Semestre (Periodo):</label>
            <select className="form-input" value={selectedPeriod} onChange={handlePeriodChange}>
              <option value="">-- Selecciona Semestre --</option>
              {periods.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ flex: 2 }}>
            <label className="form-label"><BookOpen size={14} style={{display:'inline', marginRight:'5px'}}/> Curso / Sección:</label>
            <select className="form-input" value={selectedSection} onChange={handleSectionChange} disabled={!selectedPeriod}>
              <option value="">-- Selecciona Curso --</option>
              {availableSections.map(s => (
                <option key={s.id} value={s.id}>{s.courseName} - {s.code}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Solo el DOCENTE puede crear. Admin solo edita/visualiza. Estudiante solo ve y sube. */}
        {selectedSection && user.role === 'TEACHER' && (
          <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
            <h4 style={{ marginBottom: '15px' }}>Crear Nueva Evaluación</h4>
            <form onSubmit={handleCreateAssignment} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <input name="name" className="form-input" placeholder="Nombre de la evaluación" required />
              
              <select name="type" className="form-input" required>
                <option value="TAREA">Tarea</option>
                <option value="PRACTICA">Práctica Calificada</option>
                <option value="EXAMEN">Examen Final</option>
              </select>

              <select name="category" className="form-input" required>
                <option value="">-- Selecciona Categoría --</option>
                <option value="PA">PA (Participación/Tareas)</option>
                <option value="PC1">PC1</option>
                <option value="PC2">PC2</option>
                <option value="PC3">PC3</option>
                <option value="EXFINAL">EXFINAL</option>
              </select>

              <select name="weekNumber" className="form-input" required>
                <option value="">-- Selecciona Semana --</option>
                {Array.from({length: 18}).map((_, i) => <option key={i+1} value={i+1}>Semana {i+1}</option>)}
              </select>

              <div>
                <label style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Fecha Inicio</label>
                <input name="startDate" type="datetime-local" className="form-input" required />
              </div>
              
              <div>
                <label style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Fecha Fin</label>
                <input name="endDate" type="datetime-local" className="form-input" required />
              </div>

              <button type="submit" className="btn btn-primary" style={{ gridColumn: '1 / -1' }}>
                + Crear Evaluación
              </button>
            </form>
          </div>
        )}

        {selectedSection && (
          <div>
            <h4 style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '10px' }}>Lista de Evaluaciones</h4>
            {assignments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <FileText size={48} style={{ opacity: 0.2, marginBottom: '10px' }} />
                <p>No hay evaluaciones creadas en este curso.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Tipo</th>
                      <th>Categoría</th>
                      <th>Semana</th>
                      <th>Inicio</th>
                      <th>Fin</th>
                      {user.role === 'STUDENT' && <th>Entrega</th>}
                      {user.role === 'ADMIN' && <th>Acción</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map(a => (
                      <tr key={a.id}>
                        <td><strong>{a.name}</strong></td>
                        <td>{a.type}</td>
                        <td>{a.category}</td>
                        <td>{a.weekNumber}</td>
                        <td>{new Date(a.startDate).toLocaleDateString()}</td>
                        <td>{new Date(a.endDate).toLocaleDateString()}</td>
                        
                        {user.role === 'STUDENT' && (
                          <td>
                            <div style={{display: 'flex', gap: '10px'}}>
                              <input type="file" onChange={e => setFile(e.target.files[0])} style={{fontSize: '12px', width: '180px'}} />
                              <button className="btn btn-secondary" onClick={() => handleFileUpload(a.id)} style={{padding: '5px 10px'}}>
                                <Upload size={14}/> Enviar
                              </button>
                            </div>
                          </td>
                        )}
                        
                        {user.role === 'ADMIN' && (
                          <td>
                            <button className="btn btn-secondary" onClick={() => alert('Edición en construcción...')} style={{padding: '5px 10px'}}>
                              <Edit2 size={14}/> Editar
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
