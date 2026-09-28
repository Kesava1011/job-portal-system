import api from '../lib/api';

export const companyService = {
  getCompanies: (params = {}) => {
    const query = new URLSearchParams();
    if (typeof params === 'string') {
      if (params) query.append('search', params);
    } else {
      if (params.search) query.append('search', params.search);
      if (params.industry && params.industry !== 'All') query.append('industry', params.industry);
      if (params.location) query.append('location', params.location);
    }
    const qs = query.toString();
    return api.get(`/companies${qs ? `?${qs}` : ''}`);
  },

  getCompanyById: (id) => api.get(`/companies/${id}`),

  getMyCompany: () => api.get('/companies/recruiter/my-company'),

  updateMyCompany: (data) => api.put('/companies/recruiter/my-company', data),
};

export default companyService;
