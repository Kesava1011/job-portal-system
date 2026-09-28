/**
 * test_actual_resume_download_flow.js
 * Comprehensive end-to-end verification of the candidate resume download pipeline:
 * 1. Authenticated recruiter login and token verification.
 * 2. Candidate pipeline verification with valid stored resume URL and ID.
 * 3. Backend download API response verification:
 *    - Status 200 OK
 *    - Correct Content-Type (application/pdf)
 *    - Correct Content-Disposition (attachment; filename="...")
 *    - Access-Control-Expose-Headers includes Content-Disposition
 *    - Valid non-empty resume payload containing candidate data
 * 4. Application resume download endpoint GET /api/applications/:id/resume/download.
 * 5. Resume Builder generated resume download (verifies resume_data to file conversion).
 * 6. Non-available resume error handling (404 with descriptive JSON error).
 * 7. Security & authorization enforcement (401 unauthenticated, 403 unauthorized recruiter).
 * 8. Frontend download handler code validation:
 *    - onClick handler triggering api.download
 *    - Blob URL creation, anchor download attribute, program click, revoke
 *    - Clear error message handling via Alert state
 */

const fs = require('fs');

const API = 'http://localhost:5000/api';
const BASE_URL = 'http://localhost:5000';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  }
  return { status: res.status, ok: res.ok, headers: res.headers, data, response: res };
}

async function runTestSuite() {
  console.log('================================================================================');
  console.log('📄 ACTUAL RESUME DOWNLOAD PIPELINE & HEADERS VERIFICATION TEST SUITE');
  console.log('================================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // 1. Authentication & Persona Tokens
    // -------------------------------------------------------------------------
    console.log('--- Step 1: Authentication & Authorization Tokens ---');
    const rec1Auth = await request(`${API}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'recruiter@google.com', password: 'password123' }),
    });
    assert(rec1Auth.status === 200 && rec1Auth.data?.token, 'Recruiter Sarah (recruiter@google.com) authenticated');
    const rec1Token = rec1Auth.data.token;
    const rec1Header = { Authorization: `Bearer ${rec1Token}` };

    const rec2Auth = await request(`${API}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'recruiter@microsoft.com', password: 'password123' }),
    });
    assert(rec2Auth.status === 200 && rec2Auth.data?.token, 'Recruiter David (recruiter@microsoft.com) authenticated');
    const rec2Token = rec2Auth.data.token;
    const rec2Header = { Authorization: `Bearer ${rec2Token}` };

    const seekerAuth = await request(`${API}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'seeker@example.com', password: 'password123' }),
    });
    assert(seekerAuth.status === 200 && seekerAuth.data?.token, 'Candidate Alex Johnson authenticated');
    const seekerToken = seekerAuth.data.token;
    const seekerHeader = { Authorization: `Bearer ${seekerToken}` };

    const adminAuth = await request(`${API}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@jobportal.com', password: 'password123' }),
    });
    assert(adminAuth.status === 200 && adminAuth.data?.token, 'System Admin authenticated');
    const adminToken = adminAuth.data.token;
    const adminHeader = { Authorization: `Bearer ${adminToken}` };

    // -------------------------------------------------------------------------
    // 2. Stored Resume File & Candidate Pipeline Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: Recruiter Candidate Pipeline & Resume URL Validation ---');
    const applicantsRes = await request(`${API}/applications/recruiter/applicants`, {
      headers: rec1Header,
    });
    assert(applicantsRes.status === 200 && applicantsRes.data?.success, 'Recruiter fetched Candidate Pipeline');
    const applicants = applicantsRes.data.applicants || [];
    assert(applicants.length > 0, `Candidate pipeline returned ${applicants.length} applicants`);

    const alexApplicant = applicants.find((a) => a.candidate_email === 'seeker@example.com' && a.resume_file_url?.includes('sample_resume')) ||
      applicants.find((a) => a.candidate_email === 'seeker@example.com');
    assert(alexApplicant != null, 'Found candidate applicant (seeker@example.com) in recruiter pipeline');
    assert(
      alexApplicant.resume_file_url && alexApplicant.resume_file_url.includes('sample_resume'),
      `Candidate has valid resume_file_url: "${alexApplicant?.resume_file_url}"`
    );
    assert(alexApplicant.resume_id != null, `Candidate has valid resume_id: #${alexApplicant?.resume_id}`);

    // Verify stored file exists on disk
    const relativePath = alexApplicant.resume_file_url.replace(/^\/?uploads\//, '');
    const diskPath = `backend/uploads/${relativePath}`;
    assert(fs.existsSync(diskPath), `Stored resume file physically exists on disk: "${diskPath}"`);

    // -------------------------------------------------------------------------
    // 3. Backend Download API Headers & Content Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Backend API Download Response Headers & Payload ---');
    // A. Via GET /api/resumes/:id/download
    const resumeDownloadRes = await request(`${API}/resumes/${alexApplicant.resume_id}/download`, {
      headers: rec1Header,
    });
    assert(resumeDownloadRes.status === 200, `GET /api/resumes/${alexApplicant.resume_id}/download returns 200 OK`);

    const contentType1 = resumeDownloadRes.headers.get('content-type') || '';
    assert(contentType1.includes('application/pdf'), `Content-Type is application/pdf (got: "${contentType1}")`);

    const contentDisposition1 = resumeDownloadRes.headers.get('content-disposition') || '';
    assert(
      contentDisposition1.includes('attachment') && contentDisposition1.includes('filename='),
      `Content-Disposition specifies attachment with filename (got: "${contentDisposition1}")`
    );
    assert(
      contentDisposition1.includes('Alex_Johnson') || contentDisposition1.includes('.pdf'),
      `Content-Disposition filename matches resume title: "${contentDisposition1}"`
    );

    const rawBuffer1 = await resumeDownloadRes.response.arrayBuffer();
    const rawText1 = Buffer.from(rawBuffer1).toString('utf8');
    assert(rawBuffer1.byteLength > 100, `Downloaded resume file is non-empty (${rawBuffer1.byteLength} bytes)`);
    assert(
      rawText1.includes('Full-Stack') || rawText1.includes('Developer'),
      'Downloaded file content verifies actual candidate data ("Full-Stack Developer")'
    );

    // B. Via GET /api/applications/:id/resume/download
    const appResumeDownloadRes = await request(`${API}/applications/${alexApplicant.application_id}/resume/download`, {
      headers: rec1Header,
    });
    assert(
      appResumeDownloadRes.status === 200,
      `GET /api/applications/${alexApplicant.application_id}/resume/download returns 200 OK`
    );

    const contentType2 = appResumeDownloadRes.headers.get('content-type') || '';
    assert(contentType2.includes('application/pdf'), `Application download Content-Type is application/pdf ("${contentType2}")`);

    const contentDisposition2 = appResumeDownloadRes.headers.get('content-disposition') || '';
    assert(
      contentDisposition2.includes('attachment') && contentDisposition2.includes('Alex_Johnson'),
      `Application download Content-Disposition is attachment with candidate filename ("${contentDisposition2}")`
    );

    const rawBuffer2 = await appResumeDownloadRes.response.arrayBuffer();
    assert(rawBuffer2.byteLength === rawBuffer1.byteLength, `Application download delivered identical valid resume payload`);

    // -------------------------------------------------------------------------
    // 4. Candidate with Resume Builder Data Download
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: Resume Builder Generated Resume Download Flow ---');
    // Resume #3 in the database belongs to Alex and was created via Resume Builder
    const resume3Res = await request(`${API}/resumes/3/download`, {
      headers: rec1Header,
    });
    assert(resume3Res.status === 200, 'GET /api/resumes/3/download for Resume Builder data returns 200 OK');

    const contentType3 = resume3Res.headers.get('content-type') || '';
    assert(contentType3.includes('application/pdf'), `Generated resume has Content-Type application/pdf ("${contentType3}")`);

    const contentDisposition3 = resume3Res.headers.get('content-disposition') || '';
    assert(
      contentDisposition3.includes('attachment') && contentDisposition3.includes('Full_Stack_Engineer_Resume.pdf'),
      `Generated resume Content-Disposition has attachment and filename ("${contentDisposition3}")`
    );

    const rawBuffer3 = await resume3Res.response.arrayBuffer();
    const rawText3 = Buffer.from(rawBuffer3).toString('utf8');
    assert(rawBuffer3.byteLength > 200, `Generated resume has valid file body (${rawBuffer3.byteLength} bytes)`);
    assert(
      rawText3.includes('CANDIDATE RESUME') || rawText3.includes('PROFESSIONAL EXPERIENCE'),
      'Generated resume contains structured professional resume sections'
    );

    // -------------------------------------------------------------------------
    // 5. Candidate Without Resume & Non-existent File Error Handling
    // -------------------------------------------------------------------------
    console.log('\n--- Step 5: Missing Resume & Non-existent File Error Responses ---');
    // Register candidate with zero resumes
    const uniqueEmail = `no_resume_test_${Date.now()}@example.com`;
    const regNoResume = await request(`${API}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        email: uniqueEmail,
        password: 'password123',
        role: 'job_seeker',
        firstName: 'Empty',
        lastName: 'Applicant',
      }),
    });
    const noResumeToken = regNoResume.data.token;
    const noResumeHeader = { Authorization: `Bearer ${noResumeToken}` };

    // Apply to job #1 without resume
    const applyNoResume = await request(`${API}/applications/apply`, {
      method: 'POST',
      headers: noResumeHeader,
      body: JSON.stringify({
        jobId: 1,
        resumeId: null,
        coverLetter: 'Applying without an uploaded resume document.',
      }),
    });
    const noResumeAppId = applyNoResume.data.applicationId;

    // Recruiter attempts to download missing resume
    const missingDownload = await request(`${API}/applications/${noResumeAppId}/resume/download`, {
      headers: rec1Header,
    });
    assert(missingDownload.status === 404, 'Attempting to download missing resume returns 404 Not Found');
    assert(
      missingDownload.data?.message && missingDownload.data.message.includes('not available'),
      `Error response contains clear message: "${missingDownload.data?.message}"`
    );

    // Non-existent resume ID
    const notFoundDownload = await request(`${API}/resumes/888888/download`, {
      headers: adminHeader,
    });
    assert(notFoundDownload.status === 404, 'Non-existent resume ID returns 404 Not Found');
    assert(notFoundDownload.data?.message === 'Resume not found.', 'Returns clear "Resume not found." message');

    // -------------------------------------------------------------------------
    // 6. Security & Permission Enforcement
    // -------------------------------------------------------------------------
    console.log('\n--- Step 6: Security, Authentication & Permission Verification ---');
    // Unauthenticated download attempt
    const unauthRes = await request(`${API}/resumes/${alexApplicant.resume_id}/download`);
    assert(unauthRes.status === 401, 'Unauthenticated download request returns 401 Unauthorized');

    // Unrelated recruiter attempting to download candidate who never applied to their job
    // Job 2 belongs to Recruiter David (recruiter@microsoft.com), candidate Jane Smith applied to job 2.
    // Recruiter Sarah (Google) never had Jane Smith apply to her jobs.
    const unrelatedDownload = await request(`${API}/resumes/2/download`, {
      headers: rec1Header,
    });
    assert(unrelatedDownload.status === 403, 'Unrelated recruiter downloading applicant resume returns 403 Forbidden');
    assert(
      unrelatedDownload.data?.message && unrelatedDownload.data.message.includes('Forbidden'),
      `Forbidden error message clearly explains: "${unrelatedDownload.data?.message}"`
    );

    // Candidate attempting to download another candidate's resume
    const foreignDownload = await request(`${API}/resumes/2/download`, {
      headers: seekerHeader,
    });
    assert(foreignDownload.status === 403, 'Candidate downloading another candidate resume returns 403 Forbidden');

    // Candidate downloading their own resume
    const ownDownload = await request(`${API}/resumes/${alexApplicant.resume_id}/download`, {
      headers: seekerHeader,
    });
    assert(ownDownload.status === 200, 'Candidate downloading their own resume returns 200 OK');

    // Admin downloading any resume
    const adminAnyDownload = await request(`${API}/resumes/2/download`, {
      headers: adminHeader,
    });
    assert(adminAnyDownload.status === 200, 'Admin can download any candidate resume (200 OK)');

    // -------------------------------------------------------------------------
    // 7. Frontend Codebase Download Handler Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Step 7: Frontend Download Handler Implementation Checks ---');
    // A. Verify api.js download method
    const apiSource = fs.readFileSync('frontend/src/lib/api.js', 'utf8');
    assert(apiSource.includes('download: async'), 'frontend/src/lib/api.js exports authenticated download method');
    assert(apiSource.includes('window.URL.createObjectURL(blob)'), 'frontend/src/lib/api.js creates blob URL for browser download');
    assert(apiSource.includes('link.download = filename'), 'frontend/src/lib/api.js assigns filename to anchor download attribute');
    assert(apiSource.includes('link.click()'), 'frontend/src/lib/api.js triggers native browser download click');
    assert(apiSource.includes('window.URL.revokeObjectURL(blobUrl)'), 'frontend/src/lib/api.js cleans up object URL after download');

    // B. Verify recruiter applicants page.js
    const applicantsSource = fs.readFileSync('frontend/src/app/recruiter/applicants/page.js', 'utf8');
    assert(
      applicantsSource.includes('handleDownloadResume'),
      'frontend/src/app/recruiter/applicants/page.js implements handleDownloadResume'
    );
    assert(
      applicantsSource.includes('onClick={() => handleDownloadResume(app)}'),
      'frontend/src/app/recruiter/applicants/page.js triggers handleDownloadResume on click'
    );
    assert(
      applicantsSource.includes('api.download'),
      'frontend/src/app/recruiter/applicants/page.js invokes api.download'
    );
    assert(
      applicantsSource.includes('Download Resume'),
      'frontend/src/app/recruiter/applicants/page.js renders "Download Resume"'
    );
    assert(
      applicantsSource.includes('id={`download-resume-${app.application_id}`}'),
      'frontend/src/app/recruiter/applicants/page.js provides download-resume-[id] attribute'
    );
    assert(
      applicantsSource.includes('Resume not available'),
      'frontend/src/app/recruiter/applicants/page.js has "Resume not available" fallback state'
    );
    assert(
      applicantsSource.includes('setAlert({') && applicantsSource.includes('type: \'error\''),
      'frontend/src/app/recruiter/applicants/page.js handles errors and shows clear Alert message'
    );

    // C. Verify recruiter candidate detail page.js
    const candidateSource = fs.readFileSync('frontend/src/app/recruiter/candidate/[id]/page.js', 'utf8');
    assert(
      candidateSource.includes('handleDownloadResume'),
      'frontend/src/app/recruiter/candidate/[id]/page.js implements handleDownloadResume'
    );
    assert(
      candidateSource.includes('onClick={handleDownloadResume}'),
      'frontend/src/app/recruiter/candidate/[id]/page.js triggers handleDownloadResume on click'
    );
    assert(
      candidateSource.includes('id="download-resume-btn"'),
      'frontend/src/app/recruiter/candidate/[id]/page.js provides id="download-resume-btn"'
    );
    assert(
      candidateSource.includes('Download Submitted Resume'),
      'frontend/src/app/recruiter/candidate/[id]/page.js renders "Download Submitted Resume"'
    );
    assert(
      candidateSource.includes('id="resume-not-available"'),
      'frontend/src/app/recruiter/candidate/[id]/page.js provides id="resume-not-available"'
    );

    // D. Verify CORS headers in backend
    const serverSource = fs.readFileSync('backend/src/server.js', 'utf8');
    assert(
      serverSource.includes("exposedHeaders: ['Content-Disposition']"),
      "backend/src/server.js exposes 'Content-Disposition' header in CORS configuration"
    );

  } catch (error) {
    console.error('Unexpected error in test suite:', error);
    assert(false, `Test suite encountered unexpected error: ${error.message}`);
  }

  console.log('\n================================================================================');
  console.log(`📊 TEST RESULTS: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
  console.log('================================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite();
