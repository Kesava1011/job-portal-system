import api from '../lib/api';

export const userService = {
  // Profile
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  uploadAvatar: (formData) => api.upload('/users/avatar', formData),
  getSeekerDashboard: () => api.get('/users/dashboard'),

  // Skills
  getMasterSkills: () => api.get('/users/skills/master'),
  addSkill: (data) => api.post('/users/skills', data),
  removeSkill: (id) => api.del(`/users/skills/${id}`),

  // Education
  addEducation: (data) => api.post('/users/education', data),
  deleteEducation: (id) => api.del(`/users/education/${id}`),

  // Experience
  addExperience: (data) => api.post('/users/experience', data),
  deleteExperience: (id) => api.del(`/users/experience/${id}`),

  // Projects
  addProject: (data) => api.post('/users/projects', data),
  deleteProject: (id) => api.del(`/users/projects/${id}`),

  // Certifications
  addCertification: (data) => api.post('/users/certifications', data),
  deleteCertification: (id) => api.del(`/users/certifications/${id}`),

  // Recommendations
  getRecommendations: (limit = 10) => api.get(`/recommendations?limit=${limit}`),

  // Notifications
  getNotifications: () => api.get('/notifications'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),

  // Resumes
  getResumeBuilderData: () => api.get('/resumes/builder/data'),
  getResumes: () => api.get('/resumes'),
  getResumeById: (id) => api.get(`/resumes/${id}`),
  uploadResume: (formData) => api.upload('/resumes/upload', formData),
  saveResumeBuilder: (data) => api.post('/resumes/builder', data),
  setDefaultResume: (id) => api.put(`/resumes/${id}/default`),
  deleteResume: (id) => api.del(`/resumes/${id}`),
  downloadResume: (id, filename) => api.download(`/resumes/${id}/download`, filename),

  // Company
  getCompanies: (search = '') => api.get(`/companies${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getCompanyById: (id) => api.get(`/companies/${id}`),
  getMyCompany: () => api.get('/companies/recruiter/my-company'),
  updateMyCompany: (data) => api.put('/companies/recruiter/my-company', data),
};

export default userService;
