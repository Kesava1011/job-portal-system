const API = 'http://localhost:5000/api';
const FRONTEND = 'http://localhost:3000';

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
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('===========================================================');
  console.log('🧪 DIAGNOSTIC & VERIFICATION SUITE: JOB APPLICATION FLOW');
  console.log('===========================================================\n');

  try {
    // Step 1: Backend Health & Auth Checks
    console.log('--- Step 1: Health & Authentication Verification ---');
    const health = await request(`${API}/health`);
    assert(health.data && health.data.status === 'online', 'Backend API is running and online');

    const seekerLogin = await request(`${API}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'seeker@example.com', password: 'password123' }),
    });
    assert(seekerLogin.status === 200 && seekerLogin.data.success, 'Job seeker login succeeds (seeker@example.com)');
    const seekerToken = seekerLogin.data.token;
    const seekerHeader = { Authorization: `Bearer ${seekerToken}` };

    const recruiterLogin = await request(`${API}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'recruiter@google.com', password: 'password123' }),
    });
    assert(recruiterLogin.status === 200 && recruiterLogin.data.success, 'Recruiter login succeeds (recruiter@google.com)');
    const recruiterToken = recruiterLogin.data.token;
    const recruiterHeader = { Authorization: `Bearer ${recruiterToken}` };

    // Step 2: Seeker Profile & Resumes Verification
    console.log('\n--- Step 2: Seeker Profile & Resumes ---');
    const resumesRes = await request(`${API}/resumes`, { headers: seekerHeader });
    assert(resumesRes.status === 200 && resumesRes.data.success, 'Job seeker resumes retrieved');
    assert(Array.isArray(resumesRes.data.resumes) && resumesRes.data.resumes.length > 0, 'Job seeker has at least one resume');
    const validResumeId = resumesRes.data.resumes[0].id;
    console.log(`    Found resume ID: ${validResumeId} ("${resumesRes.data.resumes[0].title}")`);

    // Step 3: Create a Dedicated Test Job to Test Clean Application Creation
    console.log('\n--- Step 3: Create Dedicated Test Job for Flow Verification ---');
    const uniqueSlug = Date.now();
    const createJobRes = await request(`${API}/jobs`, {
      method: 'POST',
      headers: recruiterHeader,
      body: JSON.stringify({
        title: `Flow Test Engineer ${uniqueSlug}`,
        company: 'Google LLC',
        location: 'Remote',
        jobType: 'Full-time',
        experienceLevel: 'Mid Level',
        experienceRequired: 2.0,
        minSalary: 110000,
        maxSalary: 140000,
        description: 'Verifying end-to-end job application submission flow.',
        requirements: 'JavaScript, React, Node.js, REST APIs',
        skills: ['JavaScript', 'REST APIs', 'SQL'],
        vacancies: 2,
        deadline: '2027-12-31',
      }),
    });
    assert(createJobRes.status === 201 && createJobRes.data.success, 'Recruiter posted dedicated test job');
    const testJobId = createJobRes.data.jobId || createJobRes.data.job?.id;
    console.log(`    Created Test Job ID: ${testJobId}`);

    // Step 4: Verify Pre-Application State
    console.log('\n--- Step 4: Pre-Application State Verification ---');
    const jobDetailsBefore = await request(`${API}/jobs/${testJobId}`, { headers: seekerHeader });
    assert(jobDetailsBefore.status === 200, 'Seeker can view job details');
    assert(jobDetailsBefore.data.job.hasApplied === false, 'Seeker hasApplied is initially false');

    const applicantsBefore = await request(`${API}/applications/recruiter/applicants?jobId=${testJobId}`, { headers: recruiterHeader });
    assert(applicantsBefore.status === 200, 'Recruiter can view applicants');
    const countBefore = applicantsBefore.data.applicants?.length || 0;
    assert(countBefore === 0, 'Initial applicant count for test job is exactly 0');

    // Step 5: Test Authentication & Role Guards on Apply Endpoint
    console.log('\n--- Step 5: Edge Cases & Error Handling on Apply Endpoint ---');
    // 5.1 Unauthenticated application
    const unauthApply = await request(`${API}/applications/apply`, {
      method: 'POST',
      body: JSON.stringify({ jobId: testJobId, resumeId: validResumeId }),
    });
    assert(unauthApply.status === 401, 'Unauthenticated apply request returns HTTP 401 Unauthorized');
    assert(unauthApply.data && unauthApply.data.message, '401 returns clear error message');

    // 5.2 Recruiter role attempting to apply
    const recruiterApply = await request(`${API}/applications/apply`, {
      method: 'POST',
      headers: recruiterHeader,
      body: JSON.stringify({ jobId: testJobId, resumeId: validResumeId }),
    });
    assert(recruiterApply.status === 403, 'Recruiter role applying returns HTTP 403 Forbidden');
    assert(
      recruiterApply.data && (recruiterApply.data.message.includes('job_seeker') || recruiterApply.data.message.includes('job seeker')),
      `403 explains access restricted to job seekers (got: "${recruiterApply.data.message}")`
    );

    // 5.3 Missing / Invalid Job ID
    const invalidJobApply = await request(`${API}/applications/apply`, {
      method: 'POST',
      headers: seekerHeader,
      body: JSON.stringify({ jobId: 'invalid-id-xyz', resumeId: validResumeId }),
    });
    assert(invalidJobApply.status === 400, 'Invalid job ID returns HTTP 400 Bad Request');
    assert(invalidJobApply.data && invalidJobApply.data.message.includes('Invalid Job ID'), 'Clear message for invalid job ID');

    // 5.4 Non-existent Job ID
    const nonexistentJobApply = await request(`${API}/applications/apply`, {
      method: 'POST',
      headers: seekerHeader,
      body: JSON.stringify({ jobId: 999999, resumeId: validResumeId }),
    });
    assert(nonexistentJobApply.status === 404, 'Non-existent job returns HTTP 404 Not Found');

    // 5.5 Resume not belonging to seeker
    const forbiddenResumeApply = await request(`${API}/applications/apply`, {
      method: 'POST',
      headers: seekerHeader,
      body: JSON.stringify({ jobId: testJobId, resumeId: 999999 }),
    });
    assert(forbiddenResumeApply.status === 403, 'Unauthorized/foreign resume returns HTTP 403 Forbidden');
    assert(
      forbiddenResumeApply.data && (forbiddenResumeApply.data.message.includes('Selected resume') || forbiddenResumeApply.data.message.includes('Forbidden')),
      `Clear error message on invalid resume (got: "${forbiddenResumeApply.data.message}")`
    );

    // Step 6: Valid Application Submission
    console.log('\n--- Step 6: Valid Application Submission Flow ---');
    const applyRes = await request(`${API}/applications/apply`, {
      method: 'POST',
      headers: seekerHeader,
      body: JSON.stringify({
        jobId: testJobId,
        resumeId: validResumeId,
        coverLetter: 'I am highly passionate about this role and meet all core requirements.',
      }),
    });
    assert(applyRes.status === 201, 'Valid application returns HTTP 201 Created');
    assert(applyRes.data.success === true, 'Response payload has success: true');
    assert(
      applyRes.data.message && applyRes.data.message.toLowerCase().includes('success'),
      `Response returns clear visible success message: "${applyRes.data.message}"`
    );
    assert(applyRes.data.applicationId != null, `Response returns created applicationId: ${applyRes.data.applicationId}`);

    // Step 7: Database Insertion Verification (Exactly One Application Created)
    console.log('\n--- Step 7: Database Verification (Exactly 1 Application Created) ---');
    const applicantsAfter = await request(`${API}/applications/recruiter/applicants?jobId=${testJobId}`, { headers: recruiterHeader });
    assert(applicantsAfter.status === 200, 'Recruiter retrieved applicants for test job');
    const applicantsList = applicantsAfter.data.applicants || [];
    assert(applicantsList.length === 1, `Applicant count for test job is EXACTLY 1 (found ${applicantsList.length})`);
    
    const candidateApp = applicantsList[0];
    assert(candidateApp.candidate_email === 'seeker@example.com', 'Application record candidate email matches seeker@example.com');
    assert(candidateApp.status === 'Applied', `Application initial status is 'Applied' (got '${candidateApp.status}')`);
    assert(
      candidateApp.cover_letter === 'I am highly passionate about this role and meet all core requirements.',
      'Application cover letter matches submitted input'
    );

    // Step 8: Verify Job Details Reflected for Seeker
    console.log('\n--- Step 8: Post-Application Seeker View ---');
    const jobDetailsAfter = await request(`${API}/jobs/${testJobId}`, { headers: seekerHeader });
    assert(jobDetailsAfter.status === 200, 'Seeker fetched job details');
    assert(jobDetailsAfter.data.job.hasApplied === true, 'job.hasApplied is now TRUE for the seeker');
    assert(jobDetailsAfter.data.job.applicationStatus === 'Applied', 'job.applicationStatus is "Applied"');

    // Step 9: Test Duplicate Application Handling (Must prevent duplicate & return clear error)
    console.log('\n--- Step 9: Duplicate Application Handling & Error Message ---');
    const duplicateApplyRes = await request(`${API}/applications/apply`, {
      method: 'POST',
      headers: seekerHeader,
      body: JSON.stringify({
        jobId: testJobId,
        resumeId: validResumeId,
        coverLetter: 'Attempting duplicate application.',
      }),
    });
    assert(duplicateApplyRes.status === 400, 'Duplicate application returns HTTP 400 Bad Request');
    assert(duplicateApplyRes.data.success === false, 'Duplicate response has success: false');
    assert(
      duplicateApplyRes.data.message && duplicateApplyRes.data.message.includes('already applied'),
      `Duplicate response returns clear error message: "${duplicateApplyRes.data.message}"`
    );

    // Verify application count remains EXACTLY 1
    const applicantsAfterDuplicate = await request(`${API}/applications/recruiter/applicants?jobId=${testJobId}`, { headers: recruiterHeader });
    const countAfterDuplicate = applicantsAfterDuplicate.data.applicants?.length || 0;
    assert(countAfterDuplicate === 1, `Applicant count remains EXACTLY 1 after duplicate attempt (found ${countAfterDuplicate})`);

    // Step 10: Frontend Modal Alert Markup Verification
    console.log('\n--- Step 10: Frontend Codebase & Routes Verification ---');
    const fs = require('fs');
    const jobDetailsFrontend = fs.readFileSync('frontend/src/app/jobs/[id]/page.js', 'utf8');
    assert(jobDetailsFrontend.includes('modalAlert'), 'frontend/src/app/jobs/[id]/page.js has modalAlert state');
    assert(
      jobDetailsFrontend.includes('<Alert type={modalAlert.type} message={modalAlert.message}'),
      'frontend/src/app/jobs/[id]/page.js renders <Alert /> inside Apply Modal'
    );
    assert(jobDetailsFrontend.includes('window.scrollTo'), 'frontend/src/app/jobs/[id]/page.js scrolls to top on modal close');

    const jobsPageFrontend = fs.readFileSync('frontend/src/app/jobs/page.js', 'utf8');
    assert(jobsPageFrontend.includes('modalAlert'), 'frontend/src/app/jobs/page.js has modalAlert state');
    assert(
      jobsPageFrontend.includes('<Alert type={modalAlert.type} message={modalAlert.message}'),
      'frontend/src/app/jobs/page.js renders <Alert /> inside Apply Modal'
    );

    const companyDetailsFrontend = fs.readFileSync('frontend/src/app/companies/[id]/page.js', 'utf8');
    assert(companyDetailsFrontend.includes('modalAlert'), 'frontend/src/app/companies/[id]/page.js has modalAlert state');
    assert(
      companyDetailsFrontend.includes('<Alert type={modalAlert.type} message={modalAlert.message}'),
      'frontend/src/app/companies/[id]/page.js renders <Alert /> inside Apply Modal'
    );

    const recommendationsFrontend = fs.readFileSync('frontend/src/app/seeker/recommendations/page.js', 'utf8');
    assert(recommendationsFrontend.includes('modalAlert'), 'frontend/src/app/seeker/recommendations/page.js has modalAlert state');
    assert(
      recommendationsFrontend.includes('<Alert type={modalAlert.type} message={modalAlert.message}'),
      'frontend/src/app/seeker/recommendations/page.js renders <Alert /> inside Apply Modal'
    );

    // Clean up test job
    console.log('\n--- Step 11: Cleanup Test Job ---');
    const deleteRes = await request(`${API}/jobs/${testJobId}`, {
      method: 'DELETE',
      headers: recruiterHeader,
    });
    assert(deleteRes.status === 200, 'Test job successfully cleaned up');

  } catch (error) {
    console.error('Unexpected error during test execution:', error);
    assert(false, `Test suite encountered an uncaught error: ${error.message}`);
  }

  console.log('\n===========================================================');
  console.log(`TEST SUMMARY: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
  console.log('===========================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests();
