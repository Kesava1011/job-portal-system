const API_URL = 'http://localhost:5000/api';

async function runSecurityAuditTests() {
  console.log('🔒 Starting Automated Security & Authorization Audit Tests...\n');
  let passedCount = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passedCount++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
    }
  }

  // -------------------------------------------------------------
  // Test 1: JWT Authentication & Token Validation
  // -------------------------------------------------------------
  console.log('1️⃣ Testing JWT Authentication & Token Validation...');
  
  // 1a. Missing token on protected endpoint
  const noTokenRes = await fetch(`${API_URL}/users/profile`);
  assert(noTokenRes.status === 401, 'Request with missing token returns 401 Unauthorized');

  // 1b. Malformed token
  const badTokenRes = await fetch(`${API_URL}/users/profile`, {
    headers: { Authorization: 'Bearer malformed.invalid.token' },
  });
  assert(badTokenRes.status === 401, 'Request with forged/malformed token returns 401 Unauthorized');

  // 1c. Header without Bearer prefix
  const noBearerRes = await fetch(`${API_URL}/users/profile`, {
    headers: { Authorization: 'Basic somebase64credentials' },
  });
  assert(noBearerRes.status === 401, 'Request without Bearer prefix returns 401 Unauthorized');

  // -------------------------------------------------------------
  // Test 2: Login & Password Validation (bcrypt verification)
  // -------------------------------------------------------------
  console.log('\n2️⃣ Testing bcrypt Password Verification & Invalid Logins...');
  
  // 2a. Wrong password for seeker
  const wrongPassRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'seeker@example.com', password: 'wrongpassword' }),
  });
  assert(wrongPassRes.status === 401, 'Login with incorrect password returns 401 Unauthorized');

  // 2b. Non-existent email
  const wrongEmailRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nonexistent@example.com', password: 'password123' }),
  });
  assert(wrongEmailRes.status === 401, 'Login with non-existent email returns 401 Unauthorized');

  // 2c. Valid logins
  const seekerLogin = await (await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'seeker@example.com', password: 'password123' }),
  })).json();
  assert(seekerLogin.success && seekerLogin.token, 'Seeker login succeeds with correct password');
  const seekerToken = seekerLogin.token;

  const recruiterLogin = await (await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'recruiter@google.com', password: 'password123' }),
  })).json();
  assert(recruiterLogin.success && recruiterLogin.token, 'Recruiter 1 login succeeds with correct password');
  const recruiter1Token = recruiterLogin.token;

  const adminLogin = await (await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@jobportal.com', password: 'password123' }),
  })).json();
  assert(adminLogin.success && adminLogin.token, 'Admin login succeeds with correct password');
  const adminToken = adminLogin.token;

  // -------------------------------------------------------------
  // Test 3: Candidate Role Authorization Boundaries
  // -------------------------------------------------------------
  console.log('\n3️⃣ Testing Candidate Role Boundaries (Denial of Privileged Access)...');

  // 3a. Candidate cannot access Admin APIs
  const seekerToAdmin = await fetch(`${API_URL}/admin/stats`, {
    headers: { Authorization: `Bearer ${seekerToken}` },
  });
  assert(seekerToAdmin.status === 403, 'Candidate accessing /api/admin/stats returns 403 Forbidden');

  // 3b. Candidate cannot access Recruiter dashboard API
  const seekerToRecDash = await fetch(`${API_URL}/jobs/recruiter/dashboard`, {
    headers: { Authorization: `Bearer ${seekerToken}` },
  });
  assert(seekerToRecDash.status === 403, 'Candidate accessing /api/jobs/recruiter/dashboard returns 403 Forbidden');

  // 3c. Candidate cannot post jobs
  const seekerPostJob = await fetch(`${API_URL}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${seekerToken}`,
    },
    body: JSON.stringify({ title: 'Hacked Job Posting', location: 'Remote', jobType: 'Full-time' }),
  });
  assert(seekerPostJob.status === 403, 'Candidate attempting to post job returns 403 Forbidden');

  // 3d. Candidate cannot access Recruiter applicants list
  const seekerToApplicants = await fetch(`${API_URL}/applications/recruiter/applicants`, {
    headers: { Authorization: `Bearer ${seekerToken}` },
  });
  assert(seekerToApplicants.status === 403, 'Candidate accessing recruiter applicants returns 403 Forbidden');

  // -------------------------------------------------------------
  // Test 4: Recruiter Role Authorization Boundaries
  // -------------------------------------------------------------
  console.log('\n4️⃣ Testing Recruiter Role Boundaries...');

  // 4a. Recruiter cannot access Admin APIs
  const recToAdmin = await fetch(`${API_URL}/admin/users`, {
    headers: { Authorization: `Bearer ${recruiter1Token}` },
  });
  assert(recToAdmin.status === 403, 'Recruiter accessing /api/admin/users returns 403 Forbidden');

  // 4b. Recruiter cannot apply for jobs (candidate action)
  const recApply = await fetch(`${API_URL}/applications/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${recruiter1Token}`,
    },
    body: JSON.stringify({ jobId: 1 }),
  });
  assert(recApply.status === 403, 'Recruiter attempting to apply for job returns 403 Forbidden');

  // 4c. Recruiter cannot access candidate profile endpoint
  const recSeekerProfile = await fetch(`${API_URL}/users/profile`, {
    headers: { Authorization: `Bearer ${recruiter1Token}` },
  });
  assert(recSeekerProfile.status === 403, 'Recruiter accessing candidate /api/users/profile returns 403 Forbidden');

  // -------------------------------------------------------------
  // Test 5: Recruiter Job Ownership & Cross-Recruiter ID Manipulation (IDOR)
  // -------------------------------------------------------------
  console.log('\n5️⃣ Testing Recruiter Job Ownership & Cross-Recruiter IDOR Protection...');

  // Register a second recruiter to test cross-recruiter isolation
  const randNum = Math.floor(Math.random() * 10000);
  const rec2Email = `recruiter2_${randNum}@company.com`;
  const rec2Reg = await (await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: rec2Email,
      password: 'password123',
      role: 'recruiter',
      firstName: 'Alice',
      lastName: 'Smith',
      companyName: 'Alice Corp',
    }),
  })).json();
  assert(rec2Reg.success, `Created second recruiter account (${rec2Email})`);
  const recruiter2Token = rec2Reg.token;

  // Recruiter 1 creates Job A
  const jobARes = await (await fetch(`${API_URL}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${recruiter1Token}`,
    },
    body: JSON.stringify({
      title: 'Recruiter 1 Exclusive Senior Role',
      description: 'Role created by Recruiter 1',
      location: 'Remote',
      jobType: 'Full-time',
    }),
  })).json();
  const jobAId = jobARes.jobId;
  assert(jobARes.success && jobAId, 'Recruiter 1 posted Job A');

  // Recruiter 2 attempts to UPDATE Recruiter 1's Job A by ID
  const rec2UpdateJobA = await fetch(`${API_URL}/jobs/${jobAId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${recruiter2Token}`,
    },
    body: JSON.stringify({ title: 'Tampered by Recruiter 2' }),
  });
  assert(rec2UpdateJobA.status === 403, 'Recruiter 2 updating Recruiter 1\'s job returns 403 Forbidden (Ownership check)');

  // Recruiter 2 attempts to DELETE Recruiter 1's Job A by ID
  const rec2DeleteJobA = await fetch(`${API_URL}/jobs/${jobAId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${recruiter2Token}` },
  });
  assert(rec2DeleteJobA.status === 403, 'Recruiter 2 deleting Recruiter 1\'s job returns 403 Forbidden (Ownership check)');

  // Recruiter 1 CAN update their own Job A
  const rec1UpdateJobA = await fetch(`${API_URL}/jobs/${jobAId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${recruiter1Token}`,
    },
    body: JSON.stringify({ title: 'Updated Legally by Recruiter 1' }),
  });
  assert(rec1UpdateJobA.status === 200, 'Recruiter 1 successfully updates their own Job A');

  // -------------------------------------------------------------
  // Test 6: Cross-Candidate Resource Protection (IDOR)
  // -------------------------------------------------------------
  console.log('\n6️⃣ Testing Candidate Cross-Account Resource Protection (IDOR)...');

  // Register Candidate 2
  const cand2Email = `candidate2_${randNum}@example.com`;
  const cand2Reg = await (await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: cand2Email,
      password: 'password123',
      role: 'candidate',
      firstName: 'Bob',
      lastName: 'Candidate',
    }),
  })).json();
  assert(cand2Reg.success, `Created second candidate account (${cand2Email})`);
  const candidate2Token = cand2Reg.token;

  // Candidate 1 applies to Job A
  const cand1Apply = await (await fetch(`${API_URL}/applications/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${seekerToken}`,
    },
    body: JSON.stringify({ jobId: jobAId, coverLetter: 'Candidate 1 letter' }),
  })).json();
  const cand1AppId = cand1Apply.applicationId;
  assert(cand1Apply.success && cand1AppId, 'Candidate 1 applied to Job A');

  // Candidate 2 attempts to WITHDRAW Candidate 1's application by changing ID in URL
  const cand2WithdrawCand1 = await fetch(`${API_URL}/applications/${cand1AppId}/withdraw`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${candidate2Token}` },
  });
  assert(cand2WithdrawCand1.status === 403, 'Candidate 2 withdrawing Candidate 1\'s application returns 403 Forbidden (IDOR check)');

  // Recruiter 2 attempts to UPDATE STATUS of Candidate 1 on Recruiter 1's Job
  const rec2UpdateApp = await fetch(`${API_URL}/applications/${cand1AppId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${recruiter2Token}`,
    },
    body: JSON.stringify({ status: 'Rejected' }),
  });
  assert(rec2UpdateApp.status === 403, 'Recruiter 2 modifying application on Recruiter 1\'s job returns 403 Forbidden');

  // -------------------------------------------------------------
  // Test 7: Recruiter Applicant Filtering & getRecruiterApplicants Query Fix
  // -------------------------------------------------------------
  console.log('\n7️⃣ Testing Recruiter Applicant Retrieval & Isolation...');
  const rec1ApplicantsRes = await fetch(`${API_URL}/applications/recruiter/applicants`, {
    headers: { Authorization: `Bearer ${recruiter1Token}` },
  });
  const rec1Applicants = await rec1ApplicantsRes.json();
  assert(rec1ApplicantsRes.status === 200 && rec1Applicants.success, 'Recruiter 1 successfully queries applicants endpoint without crash');

  const rec2ApplicantsRes = await fetch(`${API_URL}/applications/recruiter/applicants`, {
    headers: { Authorization: `Bearer ${recruiter2Token}` },
  });
  const rec2Applicants = await rec2ApplicantsRes.json();
  assert(rec2ApplicantsRes.status === 200 && rec2Applicants.success, 'Recruiter 2 queries applicants endpoint');
  // Recruiter 2 should NOT see Candidate 1's application on Recruiter 1's job
  const rec2SeesCand1 = rec2Applicants.applicants.some(a => a.application_id === cand1AppId);
  assert(!rec2SeesCand1, 'Recruiter 2 applicant list does NOT leak Recruiter 1\'s applicants');

  // -------------------------------------------------------------
  // Test 8: Admin Authorization & System Oversight
  // -------------------------------------------------------------
  console.log('\n8️⃣ Testing Admin Authorization & Management Capabilities...');
  const adminStatsRes = await fetch(`${API_URL}/admin/stats`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminStatsRes.status === 200, 'Admin can access system stats');

  // Admin can delete any job posting (administrative moderation)
  const adminDeleteJob = await fetch(`${API_URL}/jobs/${jobAId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminDeleteJob.status === 200, 'Admin can moderate/delete any job posting');

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`🎯 SECURITY AUDIT TEST RESULTS: ${passedCount} / ${totalTests} TESTS PASSED (${Math.round((passedCount/totalTests)*100)}%)`);
  console.log('================================================================\n');

  if (passedCount === totalTests) {
    console.log('🛡️ ALL SECURITY TESTS PASSED PERFECTLY!');
  } else {
    process.exit(1);
  }
}

runSecurityAuditTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
