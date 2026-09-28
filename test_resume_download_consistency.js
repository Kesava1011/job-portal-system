const API = 'http://localhost:5000/api';
const BASE_URL = 'http://localhost:5000';
const fs = require('fs');

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
  return { status: res.status, ok: res.ok, headers: res.headers, data };
}

async function runTests() {
  console.log('===============================================================');
  console.log('📄 RESUME DOWNLOAD CONSISTENCY & NOT-AVAILABLE STATE TEST SUITE');
  console.log('===============================================================\n');

  try {
    // -----------------------------------------------------------------
    // 1. Authenticate Personas
    // -----------------------------------------------------------------
    console.log('--- Step 1: Authentication & Personas ---');
    const rec1Auth = await request(`${API}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'recruiter@google.com', password: 'password123' }),
    });
    assert(rec1Auth.status === 200 && rec1Auth.data.success, 'Recruiter 1 (recruiter@google.com) authenticated');
    const rec1Token = rec1Auth.data.token;
    const rec1Header = { Authorization: `Bearer ${rec1Token}` };

    const rec2Auth = await request(`${API}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'recruiter@microsoft.com', password: 'password123' }),
    });
    assert(rec2Auth.status === 200 && rec2Auth.data.success, 'Recruiter 2 (recruiter@microsoft.com) authenticated');
    const rec2Token = rec2Auth.data.token;
    const rec2Header = { Authorization: `Bearer ${rec2Token}` };

    const seekerAuth = await request(`${API}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'seeker@example.com', password: 'password123' }),
    });
    assert(seekerAuth.status === 200 && seekerAuth.data.success, 'Candidate with Resume (seeker@example.com) authenticated');
    const seekerToken = seekerAuth.data.token;
    const seekerHeader = { Authorization: `Bearer ${seekerToken}` };

    const adminAuth = await request(`${API}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@jobportal.com', password: 'password123' }),
    });
    assert(adminAuth.status === 200 && adminAuth.data.success, 'Admin authenticated');
    const adminToken = adminAuth.data.token;
    const adminHeader = { Authorization: `Bearer ${adminToken}` };

    // Register a candidate WITHOUT a resume
    const uniqueId = Date.now();
    const noResumeEmail = `candidate_no_resume_${uniqueId}@test.com`;
    const regRes = await request(`${API}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        email: noResumeEmail,
        password: 'password123',
        role: 'job_seeker',
        firstName: 'NoResume',
        lastName: 'Candidate',
      }),
    });
    assert(regRes.status === 201 && regRes.data.success, `Candidate without resume registered (${noResumeEmail})`);
    const noResumeToken = regRes.data.token;
    const noResumeHeader = { Authorization: `Bearer ${noResumeToken}` };

    // -----------------------------------------------------------------
    // 2. Case A: Candidate WITH a Valid Uploaded Resume
    // -----------------------------------------------------------------
    console.log('\n--- Step 2: Case A - Candidate WITH Valid Uploaded Resume ---');
    // Verify candidate has uploaded resume in database
    const resumesRes = await request(`${API}/resumes`, { headers: seekerHeader });
    assert(resumesRes.status === 200 && resumesRes.data.success, 'Candidate retrieved resumes list');
    const uploadedResume = resumesRes.data.resumes?.find((r) => r.file_url);
    assert(uploadedResume != null, `Found uploaded resume ID #${uploadedResume?.id} (${uploadedResume?.file_url})`);

    // Recruiter 1 posts a test job
    const jobRes = await request(`${API}/jobs`, {
      method: 'POST',
      headers: rec1Header,
      body: JSON.stringify({
        title: `Resume Verification Job ${uniqueId}`,
        company: 'Google LLC',
        location: 'Remote',
        jobType: 'Full-time',
        experienceLevel: 'Senior',
        experienceRequired: 3.0,
        minSalary: 120000,
        maxSalary: 150000,
        description: 'Testing resume download and availability states.',
        requirements: 'JavaScript, React, Node.js',
        skills: ['JavaScript', 'React'],
        vacancies: 2,
        deadline: '2027-12-31',
      }),
    });
    assert(jobRes.status === 201 && jobRes.data.success, 'Recruiter 1 created test job');
    const testJobId = jobRes.data.jobId;

    // Seeker with resume applies to test job
    const applyWithResume = await request(`${API}/applications/apply`, {
      method: 'POST',
      headers: seekerHeader,
      body: JSON.stringify({
        jobId: testJobId,
        resumeId: uploadedResume.id,
        coverLetter: 'Applying with my uploaded resume document.',
      }),
    });
    assert(applyWithResume.status === 201 && applyWithResume.data.success, 'Candidate applied with valid uploaded resume');
    const appWithResumeId = applyWithResume.data.applicationId;

    // Recruiter fetches applicants pipeline
    const applicantsRes1 = await request(`${API}/applications/recruiter/applicants?jobId=${testJobId}`, { headers: rec1Header });
    assert(applicantsRes1.status === 200 && applicantsRes1.data.success, 'Recruiter retrieved applicants');
    const foundApp1 = applicantsRes1.data.applicants?.find((a) => a.application_id === appWithResumeId);
    assert(foundApp1 != null, 'Found application in recruiter applicants pipeline');
    assert(
      foundApp1?.resume_file_url && foundApp1.resume_file_url.includes('sample_resume'),
      `Applicant record has valid resume_file_url: "${foundApp1?.resume_file_url}"`
    );

    // Recruiter fetches candidate dossier/detail
    const candidateRes1 = await request(
      `${API}/applications/recruiter/candidate/${foundApp1.job_seeker_id}?appId=${appWithResumeId}&jobId=${testJobId}`,
      { headers: rec1Header }
    );
    assert(candidateRes1.status === 200 && candidateRes1.data.success, 'Recruiter retrieved candidate dossier');
    assert(
      candidateRes1.data.candidate?.resume_file_url && candidateRes1.data.candidate.resume_file_url.includes('sample_resume'),
      `Candidate dossier has valid resume_file_url: "${candidateRes1.data.candidate?.resume_file_url}"`
    );

    // Test direct static download URL
    const staticUrl = `${BASE_URL}${candidateRes1.data.candidate.resume_file_url}`;
    const staticRes = await request(staticUrl);
    assert(staticRes.status === 200, `Static resume file served with 200 OK (${staticUrl})`);
    assert(
      staticRes.headers.get('content-type')?.includes('application/pdf'),
      `Static resume file content-type is application/pdf (${staticRes.headers.get('content-type')})`
    );

    // Test dedicated backend download endpoint GET /api/resumes/:id/download
    const downloadEndpointUrl = `${API}/resumes/${uploadedResume.id}/download`;
    const authDownloadRes = await request(downloadEndpointUrl, { headers: rec1Header });
    assert(authDownloadRes.status === 200, `GET /api/resumes/:id/download returns 200 OK for authorized recruiter`);
    assert(
      authDownloadRes.headers.get('content-disposition')?.includes('attachment'),
      `Download header includes Content-Disposition: attachment (${authDownloadRes.headers.get('content-disposition')})`
    );

    // -----------------------------------------------------------------
    // 3. Case B: Candidate WITHOUT a Resume
    // -----------------------------------------------------------------
    console.log('\n--- Step 3: Case B - Candidate WITHOUT a Resume ---');
    // Verify no-resume candidate has 0 resumes
    const noResumesList = await request(`${API}/resumes`, { headers: noResumeHeader });
    assert(noResumesList.status === 200 && noResumesList.data.resumes?.length === 0, 'No-resume candidate has 0 resumes in database');

    // No-resume candidate applies to the same job
    const applyWithoutResume = await request(`${API}/applications/apply`, {
      method: 'POST',
      headers: noResumeHeader,
      body: JSON.stringify({
        jobId: testJobId,
        resumeId: null,
        coverLetter: 'Applying without an uploaded resume document.',
      }),
    });
    assert(applyWithoutResume.status === 201 && applyWithoutResume.data.success, 'No-resume candidate applied successfully');
    const appWithoutResumeId = applyWithoutResume.data.applicationId;

    // Recruiter fetches applicants pipeline
    const applicantsRes2 = await request(`${API}/applications/recruiter/applicants?jobId=${testJobId}`, { headers: rec1Header });
    assert(applicantsRes2.status === 200 && applicantsRes2.data.success, 'Recruiter retrieved applicants list');
    const foundApp2 = applicantsRes2.data.applicants?.find((a) => a.application_id === appWithoutResumeId);
    assert(foundApp2 != null, 'Found no-resume candidate in recruiter applicants pipeline');
    assert(
      foundApp2?.resume_file_url === null || foundApp2?.resume_file_url === undefined,
      `No-resume applicant record correctly has null/empty resume_file_url (got: ${foundApp2?.resume_file_url})`
    );

    // Recruiter fetches candidate dossier/detail for no-resume candidate
    const candidateRes2 = await request(
      `${API}/applications/recruiter/candidate/${foundApp2.job_seeker_id}?appId=${appWithoutResumeId}&jobId=${testJobId}`,
      { headers: rec1Header }
    );
    assert(candidateRes2.status === 200 && candidateRes2.data.success, 'Recruiter retrieved candidate dossier for no-resume candidate');
    assert(
      candidateRes2.data.candidate?.resume_file_url === null || candidateRes2.data.candidate?.resume_file_url === undefined,
      `No-resume candidate dossier correctly has null/empty resume_file_url (got: ${candidateRes2.data.candidate?.resume_file_url})`
    );
    assert(
      !candidateRes2.data.candidate?.resumes || candidateRes2.data.candidate.resumes.length === 0,
      'No-resume candidate has empty resumes array'
    );

    // -----------------------------------------------------------------
    // 4. Case C: Security & Access Control for Resume Download
    // -----------------------------------------------------------------
    console.log('\n--- Step 4: Security & Access Control ---');
    // Unauthenticated download request
    const unauthDownload = await request(`${API}/resumes/${uploadedResume.id}/download`);
    assert(unauthDownload.status === 401, 'Unauthenticated download request returns 401 Unauthorized');

    // Register an unrelated recruiter who candidate has never applied to
    const unauthRecruiterEmail = `unrelated_recruiter_${uniqueId}@test.com`;
    const rec3Reg = await request(`${API}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        email: unauthRecruiterEmail,
        password: 'password123',
        role: 'recruiter',
        firstName: 'Unrelated',
        lastName: 'Recruiter',
        companyName: 'Unrelated Corp',
      }),
    });
    const rec3Token = rec3Reg.data.token;
    const rec3Header = { Authorization: `Bearer ${rec3Token}` };

    // Unrelated recruiter attempting to download candidate resume
    const unauthRecruiterDownload = await request(`${API}/resumes/${uploadedResume.id}/download`, { headers: rec3Header });
    assert(unauthRecruiterDownload.status === 403, 'Unrelated recruiter downloading resume returns 403 Forbidden');

    // Candidate downloading their own resume
    const seekerSelfDownload = await request(`${API}/resumes/${uploadedResume.id}/download`, { headers: seekerHeader });
    assert(seekerSelfDownload.status === 200, 'Candidate can download their own resume (200 OK)');

    // Candidate attempting to download someone else's resume (Resume #2 belonging to Jane)
    const foreignResumeDownload = await request(`${API}/resumes/2/download`, { headers: seekerHeader });
    assert(foreignResumeDownload.status === 403, 'Candidate forbidden from downloading another candidate resume (403)');

    // Admin downloading resume
    const adminDownload = await request(`${API}/resumes/${uploadedResume.id}/download`, { headers: adminHeader });
    assert(adminDownload.status === 200, 'Admin can download any resume (200 OK)');

    // Non-existent resume download
    const nonExistentDownload = await request(`${API}/resumes/999999/download`, { headers: adminHeader });
    assert(nonExistentDownload.status === 404, 'Non-existent resume download returns 404 Not Found');

    // -----------------------------------------------------------------
    // 5. Case D: Frontend Codebase & Conditional Rendering Verification
    // -----------------------------------------------------------------
    console.log('\n--- Step 5: Frontend Conditional Rendering Codebase Checks ---');
    // Check recruiter/candidate/[id]/page.js
    const candidatePageSource = fs.readFileSync('frontend/src/app/recruiter/candidate/[id]/page.js', 'utf8');
    assert(
      candidatePageSource.includes('Download Submitted Resume'),
      'frontend/src/app/recruiter/candidate/[id]/page.js has "Download Submitted Resume" button'
    );
    assert(
      candidatePageSource.includes('id="download-resume-btn"'),
      'frontend/src/app/recruiter/candidate/[id]/page.js assigns id="download-resume-btn" to active button'
    );
    assert(
      candidatePageSource.includes('Resume not available'),
      'frontend/src/app/recruiter/candidate/[id]/page.js has clear "Resume not available" fallback state'
    );
    assert(
      candidatePageSource.includes('id="resume-not-available"'),
      'frontend/src/app/recruiter/candidate/[id]/page.js assigns id="resume-not-available"'
    );
    assert(
      !candidatePageSource.includes('http://localhost:5000undefined') && !candidatePageSource.includes('backendUrl}${candidate.resume_file_url || candidate.resumes?.[0]?.file_url}'),
      'frontend/src/app/recruiter/candidate/[id]/page.js eliminates broken/undefined href fallback'
    );

    // Check recruiter/applicants/page.js
    const applicantsPageSource = fs.readFileSync('frontend/src/app/recruiter/applicants/page.js', 'utf8');
    assert(
      applicantsPageSource.includes('Download Resume'),
      'frontend/src/app/recruiter/applicants/page.js has "Download Resume" button'
    );
    assert(
      applicantsPageSource.includes('Resume not available'),
      'frontend/src/app/recruiter/applicants/page.js has "Resume not available" state for candidates without resume'
    );
    assert(
      applicantsPageSource.includes('resume-not-available-'),
      'frontend/src/app/recruiter/applicants/page.js assigns unique resume-not-available IDs'
    );

    // -----------------------------------------------------------------
    // 6. Cleanup
    // -----------------------------------------------------------------
    console.log('\n--- Step 6: Cleanup Test Job ---');
    const delRes = await request(`${API}/jobs/${testJobId}`, {
      method: 'DELETE',
      headers: rec1Header,
    });
    assert(delRes.status === 200, 'Test job successfully cleaned up');

  } catch (error) {
    console.error('Unexpected test error:', error);
    assert(false, `Test failed with unexpected error: ${error.message}`);
  }

  console.log('\n===============================================================');
  console.log(`📊 TEST RESULTS: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
  console.log('===============================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests();
