/**
 * Centralized API client for Findora Backend REST Endpoints
 */
// Production API Base URL fallback (can be overridden dynamically by window.API_BASE_URL)
const API_BASE = window.API_BASE_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? '/api' : '/api');

function resolveImageUrl(url) {
  if (!url) return 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600&auto=format&fit=crop';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const originUrl = API_BASE.startsWith('http') ? API_BASE.replace(/\/api\/?$/, '') : '';
  return `${originUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

async function apiRequest(endpoint, options = {}) {
  const defaultHeaders = {};

  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const token = localStorage.getItem('findora_token');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method: options.method || 'GET',
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include', // Include HTTP-only authentication cookies
  };

  if (options.body) {
    config.body = options.body instanceof FormData ? options.body : JSON.stringify(options.body);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP Error ${response.status}`);
    }

    return data;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err.message);
    throw err;
  }
}

// Authentication API Methods
const AuthAPI = {
  register: async (userData) => {
    const data = await apiRequest('/auth/register', { method: 'POST', body: userData });
    if (data.success && data.token) {
      localStorage.setItem('findora_token', data.token);
    }
    return data;
  },
  login: async (credentials) => {
    const data = await apiRequest('/auth/login', { method: 'POST', body: credentials });
    if (data.success && data.token) {
      localStorage.setItem('findora_token', data.token);
    }
    return data;
  },
  logout: async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('findora_token');
    }
  },
  getMe: () => apiRequest('/auth/me'),
};

// Item API Methods
const ItemAPI = {
  create: (formData) => apiRequest('/items', { method: 'POST', body: formData }),
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/items?${queryString}`);
  },
  getById: (id) => apiRequest(`/items/${id}`),
  update: (id, formData) => apiRequest(`/items/${id}`, { method: 'PUT', body: formData }),
  delete: (id) => apiRequest(`/items/${id}`, { method: 'DELETE' }),
  getMatches: (id) => apiRequest(`/items/${id}/matches`),
};

// Claim API Methods
const ClaimAPI = {
  create: (formData) => apiRequest('/claims', { method: 'POST', body: formData }),
  getMyClaims: () => apiRequest('/claims/my'),
  getAdminClaims: (status) => apiRequest(`/admin/claims${status ? `?status=${status}` : ''}`),
  updateStatus: (id, statusData) => apiRequest(`/admin/claims/${id}`, { method: 'PUT', body: statusData }),
};

// Notification API Methods
const NotificationAPI = {
  getAll: () => apiRequest('/notifications'),
  markAsRead: (id) => apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllAsRead: () => apiRequest('/notifications/read-all', { method: 'PATCH' }),
};

// Admin API Methods
const AdminAPI = {
  getDashboardStats: () => apiRequest('/admin/dashboard'),
  getAnalytics: () => apiRequest('/admin/analytics'),
  getUsers: () => apiRequest('/admin/users'),
  updateItemStatus: (id, status) => apiRequest(`/admin/items/${id}/status`, { method: 'PATCH', body: { status } }),
  deleteItem: (id) => apiRequest(`/admin/items/${id}`, { method: 'DELETE' }),
  getActivityLogs: () => apiRequest('/admin/activity-logs'),
};
