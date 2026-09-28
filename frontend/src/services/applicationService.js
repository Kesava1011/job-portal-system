import api from '../lib/api';

export const applicationService = {
  applyForJob: (data) => api.post('/applications/apply', data),

  getSeekerApplications: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    return api.get(`/applications/my-applications?${query.toString()}`);
  },

  withdrawApplication: (id) => api.del(`/applications/${id}/withdraw`),

  toggleSaveJob: (jobId) => api.post('/applications/saved/toggle', { jobId }),

  getSavedJobs: () => api.get('/applications/saved'),

  getRecruiterApplicants: (params = {}) => {
    const query = new URLSearchParams();
    if (params.jobId) query.append('jobId', params.jobId);
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    return api.get(`/applications/recruiter/applicants?${query.toString()}`);
  },

  updateApplicationStatus: (id, status, notes = '') =>
    api.put(`/applications/${id}/status`, { status, notes }),

  getCandidateDetail: (id, params = {}) => {
    const query = new URLSearchParams();
    if (params.appId) query.append('appId', params.appId);
    if (params.jobId) query.append('jobId', params.jobId);
    const qs = query.toString();
    return api.get(`/applications/recruiter/candidate/${id}${qs ? `?${qs}` : ''}`);
  },

  downloadApplicationResume: (id, filename) =>
    api.download(`/applications/${id}/resume/download`, filename),
};

export default applicationService;
