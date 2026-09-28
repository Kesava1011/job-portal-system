// test_browser_download_simulation.js
// Tests the exact frontend download handler behavior with simulated browser DOM and download pipeline

const assert = require('assert');

// Simulate browser client globals
global.window = {
  URL: {
    createObjectURL: (blob) => 'blob:http://localhost:3000/' + Math.random().toString(36).substring(7),
    revokeObjectURL: (url) => { console.log('  [Browser Mock] window.URL.revokeObjectURL invoked for:', url); }
  }
};

let currentToken = '';
global.localStorage = {
  getItem: (key) => key === 'token' ? currentToken : null,
};

let downloadedFiles = [];
global.document = {
  body: {
    appendChild: (el) => { console.log('  [Browser Mock] document.body.appendChild anchor: download="' + el.download + '", href="' + el.href + '"'); },
    removeChild: (el) => { console.log('  [Browser Mock] document.body.removeChild anchor'); }
  },
  createElement: (tag) => {
    return {
      tagName: tag,
      href: '',
      download: '',
      click: function() {
        console.log('  [Browser Mock] anchor.click() triggered! Real browser download initiated for:', this.download);
        downloadedFiles.push(this.download);
      }
    };
  }
};

const API_BASE_URL = 'http://localhost:5000/api';

const download = async (endpoint, defaultFilename = 'resume.pdf') => {
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

  const response = await fetch(url, { method: 'GET', headers });
  if (!response.ok) {
    let errorMsg = `Download failed with status ${response.status}`;
    try {
      const data = await response.json();
      if (data?.message) errorMsg = data.message;
    } catch {}
    const error = new Error(errorMsg);
    error.status = response.status;
    throw error;
  }

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
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 100);
  }
  return { success: true, filename, blob };
};

(async () => {
  try {
    console.log('===============================================================');
    console.log('🧪 BROWSER DOWNLOAD BEHAVIOR SIMULATION TEST');
    console.log('===============================================================\n');

    console.log('1. Authenticating as Recruiter (recruiter@google.com)...');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'recruiter@google.com', password: 'password123' })
    });
    const loginData = await loginRes.json();
    assert(loginData.token, 'Login failed');
    currentToken = loginData.token;
    console.log('   Authenticated successfully. Token stored in simulated localStorage.');

    console.log('\n2. Simulating clicking "Download Resume" in Recruiter Applicants Pipeline...');
    const res1 = await download('/resumes/1/download', 'Fallback.pdf');
    console.log('   ✅ Download completed!');
    console.log('   - Extracted filename from Content-Disposition:', res1.filename);
    console.log('   - Blob byte size:', res1.blob.size, 'bytes');
    assert.strictEqual(res1.filename, 'Alex_Johnson_FullStack_Resume.pdf');
    assert(res1.blob.size > 0);

    console.log('\n3. Simulating clicking "Download Resume" via Application Endpoint...');
    const res2 = await download('/applications/58/resume/download', 'Fallback.pdf');
    console.log('   ✅ Download completed!');
    console.log('   - Extracted filename from Content-Disposition:', res2.filename);
    console.log('   - Blob byte size:', res2.blob.size, 'bytes');
    assert.strictEqual(res2.filename, 'Alex_Johnson_FullStack_Resume.pdf');
    assert(res2.blob.size > 0);

    console.log('\n4. Simulating clicking Download on Resume Builder Generated Resume...');
    const res3 = await download('/resumes/3/download', 'Builder_Fallback.pdf');
    console.log('   ✅ Download completed!');
    console.log('   - Extracted filename from Content-Disposition:', res3.filename);
    console.log('   - Blob byte size:', res3.blob.size, 'bytes');
    assert.strictEqual(res3.filename, 'Full_Stack_Engineer_Resume.pdf');
    assert(res3.blob.size > 0);

    console.log('\n5. Verifying Anchor Clicks in Browser DOM...');
    console.log('   Downloaded files captured by browser:', downloadedFiles);
    assert.strictEqual(downloadedFiles.length, 3);
    assert.deepStrictEqual(downloadedFiles, [
      'Alex_Johnson_FullStack_Resume.pdf',
      'Alex_Johnson_FullStack_Resume.pdf',
      'Full_Stack_Engineer_Resume.pdf'
    ]);

    console.log('\n===============================================================');
    console.log('🎉 ALL BROWSER SIMULATION CHECKS PASSED WITH 100% SUCCESS!');
    console.log('===============================================================');
    process.exit(0);
  } catch (err) {
    console.error('❌ Browser simulation failed:', err);
    process.exit(1);
  }
})();
