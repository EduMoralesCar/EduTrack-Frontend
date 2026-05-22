const BASE_URL = 'http://localhost:8081/api';

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
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  return handleResponse(response);
};

export const api = {
  auth: {
    login: async (username, password) => {
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      if (data && data.token) {
        localStorage.setItem('edutrack_token', data.token);
        localStorage.setItem('edutrack_user', JSON.stringify(data.user || { username, role: data.role }));
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
  }
};
