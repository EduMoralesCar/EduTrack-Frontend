export const getBaseUrl = () => {
  const customUrl = localStorage.getItem('edutrack_backend_url');
  if (customUrl) {
    return customUrl.endsWith('/') ? `${customUrl}api` : `${customUrl}/api`;
  }
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.endsWith('/') ? `${envUrl}api` : `${envUrl}/api`;
  }
  if (import.meta.env.DEV) {
    return 'http://localhost:8081/api';
  }
  const prodDefault = 'https://edutrack-backend-1nvs.onrender.com';
  return `${prodDefault}/api`;
};

export const getFileUrl = (filePath) => {
  if (!filePath) return '';
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  const customUrl = localStorage.getItem('edutrack_backend_url');
  let base = 'http://localhost:8081/';
  if (customUrl) {
    base = customUrl.endsWith('/') ? customUrl : `${customUrl}/`;
  } else {
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl) {
      base = envUrl.endsWith('/') ? envUrl : `${envUrl}/`;
    } else if (!import.meta.env.DEV) {
      base = 'https://edutrack-backend-1nvs.onrender.com/';
    }
  }
  return `${base}${filePath}`;
};

// Helper to get token
const getToken = () => localStorage.getItem('edutrack_token');

// Helper to check response and handle standard HTTP status codes
const handleResponse = async (response) => {
  if (response.status === 204) {
    return null;
  }
  
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || `Error del servidor (${response.status})`;
    
    // In case of 401 Unauthorized, we clear session
    if (response.status === 401) {
      localStorage.removeItem('edutrack_token');
      localStorage.removeItem('edutrack_user');
      // If we are in the main app and not on login page, we can force reload
      if (!window.location.pathname.includes('/login') && window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    
    throw new Error(errorMsg);
  }
  return data;
};

// Base fetch wrapper
const request = async (endpoint, options = {}) => {
  const token = getToken();
  
  const headers = {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // Only set Content-Type to application/json if it's not FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${getBaseUrl()}${endpoint}`, config);
  return handleResponse(response);
};

export const api = {
  getFileUrl,
  auth: {
    login: async (username, password) => {
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      if (data && data.token) {
        localStorage.setItem('edutrack_token', data.token);
        localStorage.setItem('edutrack_user', JSON.stringify({
          id: data.userId,
          username: data.username || username,
          role: data.role
        }));
      }
      return data;
    },
    
    me: async () => {
      const user = await request('/auth/me');
      if (user) {
        localStorage.setItem('edutrack_user', JSON.stringify(user));
      }
      return user;
    },
    
    logout: () => {
      localStorage.removeItem('edutrack_token');
      localStorage.removeItem('edutrack_user');
    },
    
    getCurrentUser: () => {
      const userStr = localStorage.getItem('edutrack_user');
      return userStr ? JSON.parse(userStr) : null;
    },
    
    isAuthenticated: () => {
      return !!getToken();
    }
  },
  
  users: {
    getAll: () => request('/users'),
    getById: (id) => request(`/users/${id}`),
    create: (data) => request('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id, data) => request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id) => request(`/users/${id}`, {
      method: 'DELETE',
    }),
  },
  
  courses: {
    getAll: () => request('/courses'),
    getById: (id) => request(`/courses/${id}`),
    create: (data) => request('/courses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id, data) => request(`/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id) => request(`/courses/${id}`, {
      method: 'DELETE',
    }),
  },
  
  sections: {
    getAll: () => request('/sections'),
    getById: (id) => request(`/sections/${id}`),
    getByCourseId: (courseId) => request(`/sections/course/${courseId}`),
    create: (data) => request('/sections', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id, data) => request(`/sections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id) => request(`/sections/${id}`, {
      method: 'DELETE',
    }),
    assignTeacher: (sectionId, teacherId) => request(`/sections/${sectionId}/teacher`, {
      method: 'PUT',
      body: JSON.stringify({ teacherId }),
    }),
  },
  
  enrollments: {
    getBySectionId: (sectionId) => request(`/enrollments/section/${sectionId}`),
    getMyEnrollments: () => request('/enrollments/my'),
    enroll: (studentId, sectionId) => request('/enrollments', {
      method: 'POST',
      body: JSON.stringify({ studentId, sectionId }),
    }),
    unenroll: (enrollmentId) => request(`/enrollments/${enrollmentId}`, {
      method: 'DELETE',
    }),
  },

  assignments: {
    create: (data) => request('/assignments', {
      method: 'POST',
      body: data,
    }),
    getBySection: (sectionId) => request(`/assignments/section/${sectionId}`),
    submit: (assignmentId, studentId, comment, file) => {
      const formData = new FormData();
      formData.append('studentId', studentId);
      if (comment) {
        formData.append('comment', comment);
      }
      formData.append('file', file);
      return request(`/assignments/${assignmentId}/submit`, {
        method: 'POST',
        body: formData,
      });
    },
    getSubmissions: (sectionId) => request(`/assignments/section/${sectionId}/submissions`)
  },

  grades: {
    record: (data) => request('/grades', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    getSectionGrades: (sectionId) => request(`/grades/section/${sectionId}`),
    getFinalGrades: (sectionId) => request(`/grades/section/${sectionId}/final`)
  },

  materials: {
    upload: (sectionId, weekNumber, title, file) => {
      const formData = new FormData();
      formData.append('sectionId', sectionId);
      formData.append('weekNumber', weekNumber);
      formData.append('title', title);
      formData.append('file', file);
      return request('/materials', {
        method: 'POST',
        body: formData,
      });
    },
    getBySection: (sectionId) => request(`/materials/section/${sectionId}`),
    delete: (id) => request(`/materials/${id}`, {
      method: 'DELETE',
    }),
    toggleVisibility: (id) => request(`/materials/${id}/toggle-visibility`, {
      method: 'PUT',
    })
  },

  attendance: {
    record: (data) => request('/attendance', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    getBySection: (sectionId) => request(`/attendance/section/${sectionId}`),
    submitJustification: (attendanceId, reason, proofFile) => {
      const formData = new FormData();
      formData.append('reason', reason);
      if (proofFile) {
        formData.append('proofFile', proofFile);
      }
      return request(`/attendance/${attendanceId}/justify`, {
        method: 'POST',
        body: formData,
      });
    },
    resolveJustification: (justificationId, status) => request(`/attendance/justifications/${justificationId}/resolve?status=${status}`, {
      method: 'PUT',
    })
  }
};
