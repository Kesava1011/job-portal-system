const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  let url;
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    url = endpoint;
  } else if (endpoint.startsWith('/api/')) {
    url = `${API_BASE_URL}${endpoint.slice(4)}`;
  } else {
    url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  }

  const headers = {
    ...options.headers,
  };

  // If body is not FormData, default to application/json
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Attach auth token if present
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data?.message || `Request failed with status ${response.status}`;
      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error.message);
    throw error;
  }
}

export const api = {
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) =>
    request(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: (endpoint, body, options = {}) =>
    request(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  del: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),
  delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),
  upload: (endpoint, formData, options = {}) =>
    request(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
    }),
  download: async (endpoint, defaultFilename = 'resume.pdf') => {
    let url;
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      url = endpoint;
    } else if (endpoint.startsWith('/api/')) {
      url = `${API_BASE_URL}${endpoint.slice(4)}`;
    } else {
      url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    }

    const headers = {};

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      let errorMsg = `Download failed with status ${response.status}`;
      try {
        const data = await response.json();
        if (data?.message) {
          errorMsg = data.message;
        }
      } catch {}
      const error = new Error(errorMsg);
      error.status = response.status;
      throw error;
    }

    // Try extracting filename from Content-Disposition header (supports standard and RFC 5987)
    let filename = defaultFilename;
    const disposition = response.headers.get('content-disposition');
    if (disposition) {
      const utfMatch = disposition.match(/filename\*=UTF-8''([^;\n]+)/i);
      if (utfMatch && utfMatch[1]) {
        try {
          filename = decodeURIComponent(utfMatch[1].replace(/['"]/g, '').trim());
        } catch {
          filename = utfMatch[1].replace(/['"]/g, '').trim();
        }
      } else {
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, '').trim();
        }
      }
    }

    const blob = await response.blob();
    if (typeof window !== 'undefined') {
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Allow browser download manager sufficient time to consume the blob stream before revoking
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 1000);
    }

    return { success: true, filename, blob };
  },
};

export default api;
