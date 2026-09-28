import api from '../lib/api';

export const adminService = {
  getStats: () => api.get('/admin/stats'),

  getUsers: (params = {}) => {
    const query = new URLSearchParams();
    if (params.role) query.append('role', params.role);
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    return api.get(`/admin/users?${query.toString()}`);
  },

  updateUserStatus: (id, status) => api.put(`/admin/users/${id}/status`, { status }),

  getJobs: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    return api.get(`/admin/jobs?${query.toString()}`);
  },

  deleteJob: (id) => api.del(`/admin/jobs/${id}`),

  getApplications: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    return api.get(`/admin/applications?${query.toString()}`);
  },
};

export default adminService;
