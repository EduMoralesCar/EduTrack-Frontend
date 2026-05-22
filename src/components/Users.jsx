import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { UserPlus, Edit2, Trash2, ShieldAlert, Plus, CheckCircle, XCircle } from 'lucide-react';

export default function Users({ user }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('STUDENT');
  const [isActive, setIsActive] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await api.users.getAll();
      setUsers(data || []);
    } catch (err) {
      setError(err.message || 'Error al obtener la lista de usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setIsEditing(false);
    setSelectedUserId(null);
    setUsername('');
    setPassword('');
    setEmail('');
    setRole('STUDENT');
    setIsActive(true);
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const openEditModal = (targetUser) => {
    setIsEditing(true);
    setSelectedUserId(targetUser.id);
    setUsername(targetUser.username);
    setPassword(''); // leave blank by default
    setEmail(targetUser.email);
    setRole(targetUser.role);
    setIsActive(targetUser.isActive !== false);
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`¿Está seguro que desea eliminar al usuario "${name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await api.users.delete(id);
      setSuccess('Usuario eliminado con éxito');
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Error al eliminar usuario');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !email || (!isEditing && !password)) {
      setError('Por favor complete todos los campos obligatorios');
      return;
    }

    setError('');
    setSuccess('');

    try {
      if (isEditing) {
        // Update user
        const updateData = { username, email, role, active: isActive };
        if (password) {
          updateData.password = password; // Only update password if filled
        }
        await api.users.update(selectedUserId, updateData);
        setSuccess('Usuario actualizado con éxito');
      } else {
        // Create user
        await api.users.create({ username, password, email, role });
        setSuccess('Usuario creado con éxito');
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Error al guardar el usuario');
    }
  };

  const getRoleBadge = (userRole) => {
    switch (userRole) {
      case 'ADMIN':
        return <span className="badge badge-admin">Admin</span>;
      case 'TEACHER':
        return <span className="badge badge-teacher">Docente</span>;
      case 'STUDENT':
        return <span className="badge badge-student">Estudiante</span>;
      default:
        return <span className="badge">{userRole}</span>;
    }
  };

  return (
    <div style={styles.container}>
      <div className="flex-between mb-20">
        <div>
          <h2 style={styles.pageTitle}>Gestión de Usuarios</h2>
          <p style={styles.pageSubtitle}>Registro y administración de los usuarios del sistema</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <UserPlus size={18} />
          <span>Nuevo Usuario</span>
        </button>
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
          <span style={{ marginLeft: '12px' }}>Cargando usuarios del sistema...</span>
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px 0', color: 'hsl(var(--text-muted))' }}>
                    No hay usuarios registrados en el sistema.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td style={{ fontWeight: '600' }}>{u.username}</td>
                    <td>{u.email}</td>
                    <td>{getRoleBadge(u.role)}</td>
                    <td>
                      {u.isActive !== false ? (
                        <span style={styles.statusActive}>
                          <CheckCircle size={14} style={{ marginRight: '4px' }} />
                          Activo
                        </span>
                      ) : (
                        <span style={styles.statusInactive}>
                          <XCircle size={14} style={{ marginRight: '4px' }} />
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={styles.actionContainer}>
                        <button
                          onClick={() => openEditModal(u)}
                          style={styles.editBtn}
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        {u.username !== user.username && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            style={styles.deleteBtn}
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Dialog */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-card" style={styles.modalContent}>
            <div className="flex-between mb-20" style={styles.modalHeader}>
              <h3>{isEditing ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}</h3>
              <button onClick={() => setShowModal(false)} style={styles.closeBtn}>
                <XCircle size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={styles.modalForm}>
              <div className="form-group">
                <label className="form-label">Nombre de Usuario *</label>
                <input
                  type="text"
                  className="form-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ej. JuanPerez"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Correo Electrónico *</label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="juan@edutrack.com"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  {isEditing ? 'Nueva Contraseña (dejar en blanco para mantener)' : 'Contraseña *'}
                </label>
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required={!isEditing}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Rol del Usuario *</label>
                <select
                  className="form-input form-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="ADMIN">Administrador (ADMIN)</option>
                  <option value="TEACHER">Docente (TEACHER)</option>
                  <option value="STUDENT">Estudiante (STUDENT)</option>
                </select>
              </div>

              {isEditing && (
                <div style={styles.checkboxGroup}>
                  <input
                    type="checkbox"
                    id="isActiveCheckbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    style={styles.checkbox}
                  />
                  <label htmlFor="isActiveCheckbox" style={styles.checkboxLabel}>
                    Usuario Activo
                  </label>
                </div>
              )}

              <div style={styles.modalFooter}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {isEditing ? 'Actualizar' : 'Guardar'}
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
  actionContainer: {
    display: 'inline-flex',
    gap: '8px',
  },
  editBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--border-light)',
    borderRadius: '6px',
    padding: '6px',
    cursor: 'pointer',
    color: '#fff',
    transition: 'all 0.2s ease',
    display: 'flex',
  },
  deleteBtn: {
    background: 'rgba(231, 76, 60, 0.1)',
    border: '1px solid rgba(231, 76, 60, 0.2)',
    borderRadius: '6px',
    padding: '6px',
    cursor: 'pointer',
    color: '#e74c3c',
    transition: 'all 0.2s ease',
    display: 'flex',
  },
  statusActive: {
    display: 'inline-flex',
    alignItems: 'center',
    color: '#2ecc71',
    fontSize: '0.85rem',
    fontWeight: '500',
  },
  statusInactive: {
    display: 'inline-flex',
    alignItems: 'center',
    color: '#e74c3c',
    fontSize: '0.85rem',
    fontWeight: '500',
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
    maxWidth: '500px',
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
    color: 'hsl(var(--text-muted))',
    cursor: 'pointer',
    display: 'flex',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    margin: '10px 0 20px',
    textAlign: 'left',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    borderRadius: '4px',
    accentColor: 'hsl(var(--primary))',
  },
  checkboxLabel: {
    fontSize: '0.95rem',
    color: '#fff',
    cursor: 'pointer',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '16px',
    borderTop: '1px solid var(--border-light)',
    paddingTop: '16px',
  }
};
