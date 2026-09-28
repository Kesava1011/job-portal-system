import api from '../lib/api';

export const jobService = {
  getJobs: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    return api.get(`/jobs?${query.toString()}`);
  },

  getJobById: (id) => api.get(`/jobs/${id}`),

  createJob: (jobData) => api.post('/jobs', jobData),

  updateJob: (id, jobData) => api.put(`/jobs/${id}`, jobData),

  deleteJob: (id) => api.del(`/jobs/${id}`),

  getRecruiterJobs: () => api.get('/jobs/recruiter/my-jobs'),

  getRecruiterDashboard: () => api.get('/jobs/recruiter/dashboard'),
};

export default jobService;
